/**
 * Emula el flujo del sync para UN mail real tomado del sync-debug-*.json.
 * Uso: node scripts/trace-sync-one-email.mjs <path-to-debug-json> <index>
 * Ej: node scripts/trace-sync-one-email.mjs sync-debug-2026-02-24T20-58-19-170Z.json 1
 *
 * El index es el índice del objeto en el array (0 = primer mail). Para Credito ANSES
 * con "Vencimiento de la cuota" podés buscar en el JSON el índice del entry.
 */

import { readFileSync } from "fs"

const REGEX_ALTERNATIVES_SEP = "||"

/** Igual que en sync: pattern tal cual (DB guarda \s \d con una barra). */
function regexFromDb(pattern) {
  return new RegExp(pattern)
}

function splitRegexAlternatives(value) {
  if (!value?.trim()) return []
  return value.split(REGEX_ALTERNATIVES_SEP).map((p) => p.trim()).filter(Boolean)
}

function normalizeSearchableText(text) {
  return text
    .replace(/\u2022/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/&#x2022;|&#8226;|&bull;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseAmountFromRaw(raw) {
  const s = raw.trim().replace(/\s/g, "")
  if (!s) return null
  const lastComma = s.lastIndexOf(",")
  const lastDot = s.lastIndexOf(".")
  const hasCommaDecimal = lastComma !== -1 && /^\d{1,3}$/.test(s.slice(lastComma + 1))
  const hasDotDecimal = lastDot !== -1 && /^\d{1,2}$/.test(s.slice(lastDot + 1))
  let normalized
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

function parseAmount(body, amountRegex) {
  const patterns = splitRegexAlternatives(amountRegex)
  console.log("  [parseAmount] patterns from DB:", JSON.stringify(patterns))
  if (patterns.length === 0) return null
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    try {
      const re = regexFromDb(pattern)
      const match = body.match(re)
      console.log(`  [parseAmount] pattern ${i} "${pattern.slice(0, 40)}..." match:`, match ? [match[0], match[1]] : null)
      if (match?.[1]) {
        const n = parseAmountFromRaw(match[1])
        if (n != null) return n
      }
    } catch (e) {
      console.log(`  [parseAmount] pattern ${i} error:`, e.message)
    }
  }
  return null
}

// Configuración por servicio (misma que en migration / DB actual)
const SERVICE_CONFIG = {
  "Credito ANSES": {
    user_name_filter: null,
    body_include_any: "Créditos ANSES,Cuota,Monto,cuota,monto",
    amount_regex:
      'Monto de [$]?\\s*(\\d+(?:\\.\\d{2})?)||[$]?\\s*(\\d+(?:\\.\\d{2})?)||Monto[^\\d]*(\\d[\\d.,]+)',
    date_regex: null,
  },
  "Visa Galicia": {
    user_name_filter: "GARCIA",
    body_include_any: "Saldo en pesos,VISA,Resumen de Cuenta,resumen de tu cuenta",
    amount_regex: "Saldo en pesos[:\\s]*([\\d.,\\s]+)",
    date_regex: "Vencimiento[:\\s]*(\\d{1,2}\\s+[A-Za-z]{3}\\s+\\d{2,4})",
  },
  "Mastercard Galicia": {
    user_name_filter: "GARCIA",
    body_include_any:
      "Total en pesos,MasterCard,Mastercard,Resumen de Tarjeta,resumen de tu tarjeta",
    amount_regex: "Total en pesos[:\\s]*([\\d.,\\s]+)",
    date_regex: "Vencimiento[:\\s]*(\\d{1,2}/\\d{1,2}/\\d{4})",
  },
}

const path = process.argv[2]
const index = parseInt(process.argv[3], 10)
if (!path || isNaN(index)) {
  console.error("Uso: node scripts/trace-sync-one-email.mjs <debug.json> <index>")
  process.exit(1)
}

const data = JSON.parse(readFileSync(path, "utf-8"))
const entry = data[index]
if (!entry) {
  console.error("No hay entry en índice", index)
  process.exit(1)
}

const config = SERVICE_CONFIG[entry.serviceName]
if (!config) {
  console.error("Servicio no configurado en script:", entry.serviceName)
  process.exit(1)
}

console.log("=== TRACE SYNC (un mail) ===\n")
console.log("serviceName:", entry.serviceName)
console.log("messageId:", entry.messageId)
console.log("subject:", entry.subject?.slice(0, 80))
console.log("body length:", entry.body?.length)
console.log("")

const searchableText = [entry.subject, entry.body ?? ""].join(" ").trim()
console.log("1. searchableText length:", searchableText.length)
console.log("   preview:", searchableText.slice(0, 200) + "...")
console.log("")

if (config.user_name_filter) {
  const ok = searchableText.toLowerCase().includes(config.user_name_filter.toLowerCase())
  console.log("2. user_name_filter:", config.user_name_filter, "→", ok ? "PASS" : "FAIL (skip)")
  if (!ok) process.exit(0)
}

if (config.body_include_any?.trim()) {
  const terms = config.body_include_any
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const textLower = searchableText.toLowerCase()
  const found = terms.filter((term) => textLower.includes(term))
  console.log("3. body_include_any (any of):", terms.slice(0, 5))
  console.log("   matched:", found.slice(0, 5), "→", found.length ? "PASS" : "FAIL (skip)")
  if (!found.length) process.exit(0)
}

const normalizedText = normalizeSearchableText(searchableText)
console.log("4. normalizedText length:", normalizedText.length)
console.log("   contains 'Monto de':", normalizedText.includes("Monto de"))
console.log("   contains 'Total en pesos':", normalizedText.includes("Total en pesos"))
console.log("   contains 'Saldo en pesos':", normalizedText.includes("Saldo en pesos"))
console.log("")

console.log("5. parseAmount(normalizedText, amount_regex):")
const amountPesos = parseAmount(normalizedText, config.amount_regex)
console.log("   result amountPesos:", amountPesos)
console.log("")

if (amountPesos == null) {
  console.log("→ Conclusión: se descarta por amount_regex (no se extrajo monto).")
} else {
  console.log("→ Conclusión: monto extraído =", amountPesos)
}
