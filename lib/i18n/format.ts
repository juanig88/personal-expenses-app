import type { Locale } from "./translations"

const localeToBcp47: Record<Locale, string> = {
  es: "es-AR",
  en: "en-US",
}

export function formatCurrency(amount: number, locale: Locale, options?: { decimals?: number }): string {
  const bcp47 = localeToBcp47[locale]
  const decimals = options?.decimals ?? 2
  return new Intl.NumberFormat(bcp47, {
    style: "decimal",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatCurrencyCompact(amount: number, locale: Locale): string {
  const bcp47 = localeToBcp47[locale]
  return new Intl.NumberFormat(bcp47, {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
