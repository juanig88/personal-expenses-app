/**
 * Parse a YYYY-MM-DD string as local date (no UTC shift).
 * new Date("2026-02-01") is UTC midnight → in Argentina shows previous day.
 */
export function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split("-").map(Number)
  return new Date(y ?? 0, ((m ?? 1) - 1), d ?? 1)
}

const localeToBcp47: Record<string, string> = {
  es: "es-AR",
  en: "en-US",
}

/**
 * Format a YYYY-MM-DD date string for display (locale-aware).
 */
export function formatLocaleDate(dateString: string, locale?: "es" | "en"): string {
  const bcp47 = locale ? localeToBcp47[locale] ?? "es-AR" : "es-AR"
  return parseLocalDate(dateString).toLocaleDateString(bcp47, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
