/**
 * Parse a YYYY-MM-DD string as local date (no UTC shift).
 * new Date("2026-02-01") is UTC midnight → in Argentina shows previous day.
 */
export function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split("-").map(Number)
  return new Date(y ?? 0, ((m ?? 1) - 1), d ?? 1)
}

/**
 * Format a YYYY-MM-DD date string for display in es-AR (e.g. 01/02/2026).
 */
export function formatLocaleDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
