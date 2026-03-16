import type { MonthSummary } from "@/application/bills/useCases"

export interface MonthlyEvolutionPoint {
  key: string
  year: number
  month: number
  income: number
  expenses: number
}

/**
 * Build a time-ordered (oldest -> newest) series for charts.
 * Label (e.g. "January 2026") should be built in the UI with getMonthName(locale, month).
 */
export function buildMonthlyEvolutionSeries(
  summaries: MonthSummary[]
): MonthlyEvolutionPoint[] {
  return [...summaries]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((s) => ({
      key: s.key,
      year: s.year,
      month: s.month,
      income: s.monthlyIncome,
      expenses: s.totalExpenses,
    }))
}

