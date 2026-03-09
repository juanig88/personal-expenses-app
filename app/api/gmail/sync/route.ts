import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { google } from "googleapis"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/** Una entrada por cada mensaje procesado (o descartado) para debug. */
interface SyncDebugEntry {
  serviceName: string
  messageId: string
  subject: string
  dateHeader: string
  body: string
  result: "skipped" | "saved"
  skipReason?:
    | "no_body"
    | "user_name_filter"
    | "body_include_any"
    | "amount_regex"
    | "due_date"
  amountPesos?: number | null
  amountDollars?: number | null
  amount?: number
  dueDate?: string | null
}

const DEFAULT_AMOUNT_REGEX = /\$\s*([\d.,]+)/
const DEFAULT_DATE_REGEX = /\b(\d{2}\/\d{2}\/\d{4})\b/

interface EmailService {
  id: string
  name: string
  from_email: string
  user_name_filter: string | null
  amount_regex: string | null
  amount_dollar_regex: string | null
  date_regex: string | null
  body_include_any: string | null
  active: boolean
}

/** Separator for multiple regexes in DB. Ej: "(\d{2}/\d{2}/\d{2})||(\d{2}-\d{2}-\d{2})" */
const REGEX_ALTERNATIVES_SEP = "||"

const MAX_REGEX_PATTERN_LENGTH = 500

/** RegExps from DB: use pattern as-is; limit length to mitigate ReDoS. */
function regexFromDb(pattern: string): RegExp {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    throw new Error("Regex pattern too long")
  }
  return new RegExp(pattern)
}

/** Split DB regex field into individual patterns (trimmed, non-empty). */
function splitRegexAlternatives(value: string | null): string[] {
  if (!value?.trim()) return []
  return value.split(REGEX_ALTERNATIVES_SEP).map((p) => p.trim()).filter(Boolean)
}

function decodeBase64(data: string): string | null {
  try {
    return Buffer.from(data, "base64").toString("utf-8")
  } catch {
    try {
      return Buffer.from(data, "base64url").toString("utf-8")
    } catch {
      return null
    }
  }
}

/** Strip HTML tags to get plain text for regex matching. */
function stripHtml(html: string): string {
  // Quitar <style> y <script> primero; si no, el texto queda solo con CSS/JS (ej. resúmenes Banco Galicia).
  let out = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
  out = out.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
  return out
}

/** Quita tildes para comparación (GARCIA matchea García). */
function normalizeAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

/** Decodifica entidades HTML (&#243;, &#xF3;, &oacute;) para que regex con "dólares" matchee. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&oacute;/gi, "ó")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

/** Returns true if the error is Google OAuth invalid_grant (expired/revoked refresh token). */
function isInvalidGrantError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes("invalid_grant")) return true
  const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: unknown }).cause : null
  if (cause instanceof Error && cause.message?.includes("invalid_grant")) return true
  const res = cause && typeof cause === "object" && "response" in cause ? (cause as { response?: { data?: { error?: string } } }).response : null
  if (res?.data?.error === "invalid_grant") return true
  return false
}

/** Normaliza texto para que regex de montos/fechas coincidan (viñetas, espacios). */
function normalizeSearchableText(text: string): string {
  const decoded = decodeHtmlEntities(text)
  return decoded
    .replace(/\u2022/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/&#x2022;|&#8226;|&bull;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function collectParts(
  acc: string[],
  payload: { body?: { data?: string | null }; parts?: Array<{ body?: { data?: string | null }; parts?: unknown[] }> } | null
): void {
  if (!payload) return
  if (payload.body?.data) {
    const decoded = decodeBase64(payload.body.data)
    if (decoded) acc.push(decoded.startsWith("<") ? stripHtml(decoded) : decoded)
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.body?.data) {
        const decoded = decodeBase64(part.body.data)
        if (decoded) acc.push(decoded.startsWith("<") ? stripHtml(decoded) : decoded)
      }
      if (part.parts) collectParts(acc, part as typeof payload)
    }
  }
}

/** Get all searchable text from the message (snippet + decoded body). */
function getMessageBody(
  snippet: string | null | undefined,
  payload: unknown
): string {
  const parts: string[] = []
  if (snippet) parts.push(snippet)
  collectParts(parts, payload as Parameters<typeof collectParts>[1])
  return parts.join(" ")
}

/**
 * Normaliza monto en formato AR (1.553.913,69 o 23.006,66) o US (66757.73 o 5,43).
 * AR: punto miles, coma decimal. US: coma miles, punto decimal (o solo punto decimal).
 */
function parseAmountFromRaw(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "")
  if (!s) return null
  const lastComma = s.lastIndexOf(",")
  const lastDot = s.lastIndexOf(".")
  const hasCommaDecimal =
    lastComma !== -1 &&
    /^\d{1,3}$/.test(s.slice(lastComma + 1))
  const hasDotDecimal =
    lastDot !== -1 &&
    /^\d{1,2}$/.test(s.slice(lastDot + 1))
  let normalized: string
  if (hasCommaDecimal && !hasDotDecimal) {
    normalized = s.replace(/\./g, "").replace(",", ".")
  } else if (hasDotDecimal) {
    normalized = s.replace(/,/g, "")
  } else {
    normalized = s.replace(/\./g, "").replace(",", ".")
  }
  const n = parseFloat(normalized)
  return Number.isNaN(n) ? null : n
}

function parseAmount(body: string, amountRegex: string | null): number | null {
  const patterns = splitRegexAlternatives(amountRegex)
  if (patterns.length === 0) {
    const match = body.match(DEFAULT_AMOUNT_REGEX)
    if (!match?.[1]) return null
    return parseAmountFromRaw(match[1])
  }
  for (const pattern of patterns) {
    try {
      const re = regexFromDb(pattern)
      const match = body.match(re)
      if (match?.[1]) {
        const n = parseAmountFromRaw(match[1])
        if (n != null) return n
      }
    } catch {
      // invalid pattern, try next
    }
  }
  return null
}

/** Igual que parseAmount pero para la columna amount_dollar_regex (monto en USD). */
function parseAmountDollar(
  body: string,
  amountDollarRegex: string | null
): number | null {
  if (!amountDollarRegex?.trim()) return null
  const patterns = splitRegexAlternatives(amountDollarRegex)
  for (const pattern of patterns) {
    try {
      const re = regexFromDb(pattern)
      const match = body.match(re)
      if (match?.[1]) {
        const n = parseAmountFromRaw(match[1])
        if (n != null) return n
      }
    } catch {
      // invalid pattern, try next
    }
  }
  return null
}

const DOLAR_OFICIAL_URL = "https://dolarapi.com/v1/dolares/oficial"

/** Obtiene la cotización venta del dólar oficial (ARS por 1 USD). */
async function getDolarOficialVenta(): Promise<number> {
  const res = await fetch(DOLAR_OFICIAL_URL)
  if (!res.ok) throw new Error(`Dolar API error: ${res.status}`)
  const data = (await res.json()) as { venta?: number }
  const venta = data?.venta
  if (typeof venta !== "number" || venta <= 0) {
    throw new Error("Dolar API: venta inválida")
  }
  return venta
}

/** DD/MM/YY or DD/MM/YYYY - fallback si ningún regex de la DB matchea. */
const FALLBACK_DATE_REGEX = /(\d{1,2}\/\d{1,2}\/\d{2,4})/

/** Visa Galicia: "02 Mar 26" o "02 Mar 2026" */
const SHORT_DATE_REGEX = /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/

const SHORT_MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  // Español (Galicia: "05 Ene 26")
  ene: 1, abr: 4, ago: 8, dic: 12,
}

/** Patrón "entre el X y el Y de febrero" → due_date = primer día del mes + año del mail. */
const RANGO_MES_REGEX = /entre el \d{1,2} y el \d{1,2} de ([a-zA-Záéíóúñ]+)/i

const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

function normalizeCapturedDate(captured: string): string | null {
  const shortMatch = captured.match(SHORT_DATE_REGEX)
  if (shortMatch) {
    const [, day, monthStr, yearStr] = shortMatch
    const monthNum = SHORT_MONTHS[monthStr?.toLowerCase().slice(0, 3) ?? ""]
    if (monthNum == null) return null
    const fullYear = (yearStr?.length ?? 0) === 2 ? `20${yearStr}` : yearStr
    return `${fullYear}-${String(monthNum).padStart(2, "0")}-${day?.padStart(2, "0")}`
  }
  const parts = captured.split(/\D/).filter(Boolean)
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  const fullYear = year.length === 2 ? `20${year}` : year
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

/**
 * Si el texto capturado es "entre el 1 y el 10 de febrero", devuelve due_date
 * como primer día del mes + mes extraído + año del mail (YYYY-MM-DD).
 */
function dueDateFromMonthRange(
  captured: string,
  emailSentDate: Date | null
): string | null {
  const rangeMatch = captured.match(RANGO_MES_REGEX)
  if (!rangeMatch?.[1]) return null
  const monthName = rangeMatch[1].toLowerCase().trim()
  const monthNum = SPANISH_MONTHS[monthName]
  if (monthNum == null) return null
  const year = emailSentDate ? emailSentDate.getFullYear() : new Date().getFullYear()
  const month = String(monthNum).padStart(2, "0")
  return `${year}-${month}-01`
}

function parseDueDate(
  body: string,
  dateRegex: string | null,
  emailSentDate?: Date | null
): string | null {
  const patterns = splitRegexAlternatives(dateRegex)
  for (const pattern of patterns) {
    try {
      const re = regexFromDb(pattern)
      const match = body.match(re)
      if (match?.[1]) {
        const captured = match[1]
        const fromRange = dueDateFromMonthRange(captured, emailSentDate ?? null)
        if (fromRange) return fromRange
        const normalized = normalizeCapturedDate(captured)
        if (normalized) return normalized
      }
    } catch {
      // invalid pattern, try next
    }
  }
  const match = body.match(DEFAULT_DATE_REGEX) ?? body.match(FALLBACK_DATE_REGEX)
  if (match?.[1]) return normalizeCapturedDate(match[1])
  return null
}

export async function GET(request: Request) {
  console.log("[gmail/sync] Request received")

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log("[gmail/sync] Unauthorized: missing or invalid Authorization (CRON_SECRET)")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  console.log("[gmail/sync] Auth OK, starting sync")

  try {
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("gmail_accounts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)

    if (accountsError || !accounts?.length) {
      console.log("[gmail/sync] No Gmail account:", accountsError?.message ?? "empty list")
      return NextResponse.json(
        { error: "No Gmail account found" },
        { status: 400 }
      )
    }
    const account = accounts[0]
    console.log("[gmail/sync] Using account:", account.user_email)

    const { data: services, error: servicesError } = await supabaseAdmin
      .from("email_services")
      .select("id, name, from_email, user_name_filter, amount_regex, amount_dollar_regex, date_regex, body_include_any, active")
      .eq("active", true)

    if (servicesError) {
      console.error("[gmail/sync] Error loading email_services:", servicesError)
      return NextResponse.json(
        { error: "Failed to load email services" },
        { status: 500 }
      )
    }

    if (!services?.length) {
      console.log("[gmail/sync] No active email_services configured")
      return NextResponse.json(
        { error: "No active email services configured. Add rows to email_services." },
        { status: 400 }
      )
    }
    console.log("[gmail/sync] Active services:", (services as EmailService[]).map((s) => s.name).join(", "))

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    auth.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    })

    auth.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        await supabaseAdmin
          .from("gmail_accounts")
          .update({
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date ?? null,
          })
          .eq("user_email", account.user_email)
      }
    })

    const gmail = google.gmail({ version: "v1", auth })
    console.log("[gmail/sync] Gmail client ready")

    let totalProcessed = 0
    const syncDebugLog: SyncDebugEntry[] = []

    for (const service of services as EmailService[]) {
      let dolarVentaCache: number | null = null
      console.log("[gmail/sync] Processing service:", service.name, "from:", service.from_email)

      const res = await gmail.users.messages.list({
        userId: "me",
        q: `from:${service.from_email}`,
        maxResults: 50,
      })

      const messages = res.data.messages ?? []
      console.log("[gmail/sync] Service", service.name, "| messages found:", messages.length)

      for (const msg of messages) {
        const msgData = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        })

        const headers = msgData.data.payload?.headers ?? []
        const subject =
          (headers.find((h) => h.name === "Subject")?.value as string) ?? ""
        const dateHeader =
          (headers.find((h) => h.name === "Date")?.value as string) ?? ""

        const body = getMessageBody(msgData.data.snippet, msgData.data.payload ?? null)
        const searchableText = [subject, body ?? ""].join(" ").trim()

        const baseEntry: Omit<SyncDebugEntry, "result" | "skipReason"> = {
          serviceName: service.name,
          messageId: msg.id!,
          subject,
          dateHeader,
          body: body ?? "",
        }

        if (!body && !subject) {
          syncDebugLog.push({
            ...baseEntry,
            result: "skipped",
            skipReason: "no_body",
          })
          continue
        }

        if (service.user_name_filter) {
          const textNorm = normalizeAccents(searchableText.toLowerCase())
          const filterNorm = normalizeAccents(service.user_name_filter.toLowerCase())
          if (!textNorm.includes(filterNorm)) {
            syncDebugLog.push({
              ...baseEntry,
              result: "skipped",
              skipReason: "user_name_filter",
            })
            continue
          }
        }

        if (service.body_include_any?.trim()) {
          const terms = service.body_include_any.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
          const textLower = searchableText.toLowerCase()
          if (terms.length > 0 && !terms.some((term) => textLower.includes(term))) {
            syncDebugLog.push({
              ...baseEntry,
              result: "skipped",
              skipReason: "body_include_any",
            })
            continue
          }
        }

        const normalizedText = normalizeSearchableText(searchableText)
        const amountPesos = parseAmount(normalizedText, service.amount_regex)
        if (amountPesos == null) {
          syncDebugLog.push({
            ...baseEntry,
            result: "skipped",
            skipReason: "amount_regex",
            amountPesos: null,
          })
          continue
        }

        let amount: number
        let amountDollars: number | null = null
        // Solo entramos acá si el servicio tiene amount_dollar_regex (ej. Visa/Mastercard Galicia).
        if (service.amount_dollar_regex?.trim()) {
          amountDollars = parseAmountDollar(normalizedText, service.amount_dollar_regex)
          if (amountDollars != null && amountDollars > 0) {
            if (dolarVentaCache === null) {
              dolarVentaCache = await getDolarOficialVenta()
            }
            amount = Math.round((amountPesos + amountDollars * dolarVentaCache) * 100) / 100
          } else {
            amount = amountPesos
          }
        } else {
          amount = amountPesos
        }

        let sentDate: Date | null = null
        if (dateHeader) {
          sentDate = new Date(dateHeader)
        }

        const dueDate = parseDueDate(normalizedText, service.date_regex, sentDate)
        if (!dueDate) {
          syncDebugLog.push({
            ...baseEntry,
            result: "skipped",
            skipReason: "due_date",
            amountPesos,
            amountDollars,
            amount,
            dueDate: null,
          })
          continue
        }

        syncDebugLog.push({
          ...baseEntry,
          result: "saved",
          amountPesos,
          amountDollars,
          amount,
          dueDate,
        })

        // No pisar status (paid) al sincronizar: si la fila existe, solo actualizar monto/datos; si no, insertar con pending
        const { data: existing } = await supabaseAdmin
          .from("bills")
          .select("id, status")
          .eq("user_email", account.user_email)
          .eq("service", service.name)
          .eq("due_date", dueDate)
          .maybeSingle()

        if (existing) {
          const { error } = await supabaseAdmin
            .from("bills")
            .update({
              amount,
              external_id: msg.id,
              source: "gmail",
              currency: "ARS",
              sent_date: sentDate,
            })
            .eq("id", existing.id)
          if (error) {
            console.error("[gmail/sync] Bill update error:", error)
          } else {
            totalProcessed++
            console.log("[gmail/sync] Updated bill:", service.name, dueDate, amount, "| id:", existing.id)
          }
        } else {
          const { error } = await supabaseAdmin.from("bills").insert({
            user_email: account.user_email,
            service: service.name,
            amount,
            due_date: dueDate,
            external_id: msg.id,
            source: "gmail",
            status: "pending",
            currency: "ARS",
            sent_date: sentDate,
          })
          if (error) {
            console.error("[gmail/sync] Bill insert error:", error)
          } else {
            totalProcessed++
            console.log("[gmail/sync] Inserted bill:", service.name, dueDate, amount)
          }
        }
      }
      const skipped = syncDebugLog.filter((e) => e.serviceName === service.name && e.result === "skipped").length
      const saved = syncDebugLog.filter((e) => e.serviceName === service.name && e.result === "saved").length
      console.log("[gmail/sync] Service", service.name, "done | saved:", saved, "skipped:", skipped)
    }

    let debugFile: string | null = null
    if (process.env.NODE_ENV === "development") {
      const debugPath = join(
        process.cwd(),
        `sync-debug-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      )
      await writeFile(
        debugPath,
        JSON.stringify(syncDebugLog, null, 2),
        "utf-8"
      )
      console.log("[gmail/sync] Debug log written to", debugPath)
      debugFile = debugPath
    }

    console.log("[gmail/sync] Completed | totalProcessed:", totalProcessed, "| services:", (services as EmailService[]).length, "| debug entries:", syncDebugLog.length)

    return NextResponse.json({
      success: true,
      servicesProcessed: services.length,
      totalProcessed,
      ...(debugFile != null && { debugFile }),
    })
  } catch (err) {
    console.error("[gmail/sync] Error:", err)
    console.error("[gmail/sync] Error name:", err instanceof Error ? err.name : "unknown")
    console.error("[gmail/sync] Error message:", err instanceof Error ? err.message : String(err))
    if (err instanceof Error && err.cause) {
      console.error("[gmail/sync] Error cause:", err.cause)
    }
    if (isInvalidGrantError(err)) {
      return NextResponse.json(
        {
          error: "gmail_reauth_required",
          message:
            "Gmail access has expired or was revoked. Please sign out and sign in again to re-authorize.",
        },
        { status: 401 }
      )
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
