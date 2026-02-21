import { NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_AMOUNT_REGEX = /\$\s*([\d.,]+)/
const DEFAULT_DATE_REGEX = /\b(\d{2}\/\d{2}\/\d{4})\b/

interface EmailService {
  id: string
  name: string
  from_email: string
  user_name_filter: string | null
  amount_regex: string | null
  date_regex: string | null
  body_include_any: string | null
  active: boolean
}

/** Separator for multiple regexes in DB. Ej: "(\d{2}/\d{2}/\d{2})||(\d{2}-\d{2}-\d{2})" */
const REGEX_ALTERNATIVES_SEP = "||"

/** RegExps from DB: escape backslashes so \d \b etc. work in JS RegExp. */
function regexFromDb(pattern: string): RegExp {
  const escaped = pattern.replace(/\\/g, "\\\\")
  return new RegExp(escaped)
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
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
}

/** Get all searchable text from the message (snippet + decoded body). */
function getMessageBody(
  snippet: string | null | undefined,
  payload: unknown
): string {
  const parts: string[] = []
  if (snippet) parts.push(snippet)
  const p = payload as { body?: { data?: string | null }; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } }> } | null
  if (p?.body?.data) {
    const decoded = decodeBase64(p.body.data)
    if (decoded) parts.push(decoded.startsWith("<") ? stripHtml(decoded) : decoded)
  }
  if (p?.parts) {
    for (const part of p.parts) {
      if (part.body?.data) {
        const decoded = decodeBase64(part.body.data)
        if (decoded) parts.push(decoded.startsWith("<") ? stripHtml(decoded) : decoded)
      }
    }
  }
  return parts.join(" ")
}

function parseAmount(body: string, amountRegex: string | null): number | null {
  const patterns = splitRegexAlternatives(amountRegex)
  if (patterns.length === 0) {
    const match = body.match(DEFAULT_AMOUNT_REGEX)
    if (!match?.[1]) return null
    const raw = match[1].replace(/\./g, "").replace(",", ".").replace(/,$/, "")
    const n = parseFloat(raw)
    return Number.isNaN(n) ? null : n
  }
  for (const pattern of patterns) {
    try {
      const re = regexFromDb(pattern)
      const match = body.match(re)
      if (match?.[1]) {
        const raw = match[1].replace(/\./g, "").replace(",", ".").replace(/,$/, "")
        const n = parseFloat(raw)
        if (!Number.isNaN(n)) return n
      }
    } catch {
      // invalid pattern, try next
    }
  }
  return null
}

/** DD/MM/YY or DD/MM/YYYY - fallback si ningún regex de la DB matchea. */
const FALLBACK_DATE_REGEX = /(\d{1,2}\/\d{1,2}\/\d{2,4})/

function normalizeCapturedDate(captured: string): string | null {
  const parts = captured.split(/\D/).filter(Boolean)
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  const fullYear = year.length === 2 ? `20${year}` : year
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

function parseDueDate(body: string, dateRegex: string | null): string | null {
  const patterns = splitRegexAlternatives(dateRegex)
  for (const pattern of patterns) {
    try {
      const re = regexFromDb(pattern)
      const match = body.match(re)
      if (match?.[1]) {
        const normalized = normalizeCapturedDate(match[1])
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

export async function GET() {
  try {
    const { data: accounts, error: accountsError } = await supabase
      .from("gmail_accounts")
      .select("*")
      .limit(1)

    if (accountsError || !accounts?.length) {
      return NextResponse.json(
        { error: "No Gmail account found" },
        { status: 400 }
      )
    }

    const { data: services, error: servicesError } = await supabase
      .from("email_services")
      .select("id, name, from_email, user_name_filter, amount_regex, date_regex, body_include_any, active")
      .eq("active", true)

    if (servicesError) {
      console.error("[gmail/sync] Error loading email_services:", servicesError)
      return NextResponse.json(
        { error: "Failed to load email services" },
        { status: 500 }
      )
    }

    if (!services?.length) {
      return NextResponse.json(
        { error: "No active email services configured. Add rows to email_services." },
        { status: 400 }
      )
    }

    const account = accounts[0]

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
        await supabase
          .from("gmail_accounts")
          .update({
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date ?? null,
          })
          .eq("user_email", account.user_email)
      }
    })

    const gmail = google.gmail({ version: "v1", auth })

    let totalProcessed = 0

    for (const service of services as EmailService[]) {
      const res = await gmail.users.messages.list({
        userId: "me",
        q: `from:${service.from_email}`,
        maxResults: 10,
      })

      const messages = res.data.messages ?? []

      for (const msg of messages) {
        const msgData = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        })

        const body = getMessageBody(msgData.data.snippet, msgData.data.payload ?? null)

        if (!body) continue

        if (
          service.user_name_filter &&
          !body.toLowerCase().includes(service.user_name_filter.toLowerCase())
        ) {
          continue
        }

        if (service.body_include_any?.trim()) {
          const terms = service.body_include_any.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
          const bodyLower = body.toLowerCase()
          if (terms.length > 0 && !terms.some((term) => bodyLower.includes(term))) {
            continue
          }
        }

        const amount = parseAmount(body, service.amount_regex)
        if (amount == null) continue

        const dueDate = parseDueDate(body, service.date_regex)
        if (!dueDate) continue

        const headers = msgData.data.payload?.headers ?? []
        const dateHeader = headers.find((h) => h.name === "Date")
        let sentDate: Date | null = null
        if (dateHeader?.value) {
          sentDate = new Date(dateHeader.value)
        }

        // No pisar status (paid) al sincronizar: si la fila existe, solo actualizar monto/datos; si no, insertar con pending
        const { data: existing } = await supabase
          .from("bills")
          .select("id, status")
          .eq("user_email", account.user_email)
          .eq("service", service.name)
          .eq("due_date", dueDate)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase
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
          }
        } else {
          const { error } = await supabase.from("bills").insert({
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
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      servicesProcessed: services.length,
      totalProcessed,
    })
  } catch (err) {
    console.error("[gmail/sync]", err)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
