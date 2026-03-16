import { describe, it, expect } from "vitest"
import { buildMonthlyEvolutionSeries } from "./chart"
import type { MonthSummary } from "./useCases"

function summary(overrides: Partial<MonthSummary> & { key: string; year: number; month: number; monthName: string }): MonthSummary {
  return {
    totalExpenses: 0,
    monthlyIncome: 0,
    difference: 0,
    bills: [],
    ...overrides,
  }
}

describe("buildMonthlyEvolutionSeries", () => {
  it("sorts ascending by key and maps fields", () => {
    const input: MonthSummary[] = [
      summary({ key: "2026-02", year: 2026, month: 2, monthName: "Febrero", totalExpenses: 20, monthlyIncome: 200, difference: 180 }),
      summary({ key: "2026-01", year: 2026, month: 1, monthName: "Enero", totalExpenses: 10, monthlyIncome: 100, difference: 90 }),
    ]

    const got = buildMonthlyEvolutionSeries(input)

    expect(got.map((p) => p.key)).toEqual(["2026-01", "2026-02"])
    expect(got[0]).toEqual({
      key: "2026-01",
      year: 2026,
      month: 1,
      income: 100,
      expenses: 10,
    })
  })

  it("handles empty input", () => {
    expect(buildMonthlyEvolutionSeries([])).toEqual([])
  })
})

