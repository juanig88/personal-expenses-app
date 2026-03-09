import { describe, it, expect } from "vitest"
import {
  groupBillsByMonth,
  getMonthlySummaries,
  type MonthSummary,
} from "./billingService"
import type { Bill } from "@/types/bill"

function bill(overrides: Partial<Bill> & { id: string; dueDate: string; amount: number; serviceName: string }): Bill {
  return {
    status: "pending",
    type: "other",
    sentDate: null,
    ...overrides,
  }
}

describe("groupBillsByMonth", () => {
  it.each<{ name: string; bills: Bill[]; expectedKeys: string[] }>([
    {
      name: "happy path multiple months",
      bills: [
        bill({ id: "1", serviceName: "A", amount: 10, dueDate: "2026-01-15" }),
        bill({ id: "2", serviceName: "B", amount: 20, dueDate: "2026-01-20" }),
        bill({ id: "3", serviceName: "C", amount: 30, dueDate: "2026-02-01" }),
      ],
      expectedKeys: ["2026-01", "2026-02"],
    },
    {
      name: "empty list",
      bills: [],
      expectedKeys: [],
    },
    {
      name: "single bill",
      bills: [bill({ id: "1", serviceName: "X", amount: 1, dueDate: "2025-12-31" })],
      expectedKeys: ["2025-12"],
    },
  ])("$name", ({ bills, expectedKeys }) => {
    const got = groupBillsByMonth(bills)
    expect(Object.keys(got).sort()).toEqual(expectedKeys.sort())
    const totalBills = Object.values(got).reduce((acc, arr) => acc + arr.length, 0)
    expect(totalBills).toBe(bills.length)
  })

  it("uses due_date slice YYYY-MM", () => {
    const bills = [
      bill({ id: "1", serviceName: "A", amount: 1, dueDate: "2026-02-28" }),
    ]
    const got = groupBillsByMonth(bills)
    expect(got["2026-02"]).toHaveLength(1)
    expect(got["2026-02"]![0].dueDate).toBe("2026-02-28")
  })
})

describe("getMonthlySummaries", () => {
  it.each<{ name: string; grouped: Record<string, Bill[]>; incomeByKey?: Record<string, number>; expectedCount: number }>([
    {
      name: "happy path with income",
      grouped: {
        "2026-01": [bill({ id: "1", serviceName: "A", amount: 100, dueDate: "2026-01-15" })],
        "2026-02": [bill({ id: "2", serviceName: "B", amount: 50, dueDate: "2026-02-01" })],
      },
      incomeByKey: { "2026-01": 200, "2026-02": 150 },
      expectedCount: 2,
    },
    {
      name: "empty grouped",
      grouped: {},
      expectedCount: 0,
    },
    {
      name: "missing income defaults to 0",
      grouped: { "2026-01": [bill({ id: "1", serviceName: "A", amount: 80, dueDate: "2026-01-01" })] },
      incomeByKey: {},
      expectedCount: 1,
    },
  ])("$name", ({ grouped, incomeByKey, expectedCount }) => {
    const got = getMonthlySummaries(grouped, incomeByKey ?? {})
    expect(got).toHaveLength(expectedCount)
    got.forEach((s: MonthSummary) => {
      expect(s.key).toMatch(/^\d{4}-\d{2}$/)
      expect(s.totalExpenses).toBeGreaterThanOrEqual(0)
      expect(s.difference).toBe(s.monthlyIncome - s.totalExpenses)
    })
  })

  it("sorts keys reverse chronological", () => {
    const grouped = {
      "2026-01": [bill({ id: "1", serviceName: "A", amount: 1, dueDate: "2026-01-01" })],
      "2026-03": [bill({ id: "2", serviceName: "B", amount: 1, dueDate: "2026-03-01" })],
      "2026-02": [bill({ id: "3", serviceName: "C", amount: 1, dueDate: "2026-02-01" })],
    }
    const got = getMonthlySummaries(grouped)
    expect(got.map((s) => s.key)).toEqual(["2026-03", "2026-02", "2026-01"])
  })

  it("month names are Spanish", () => {
    const grouped = {
      "2026-01": [bill({ id: "1", serviceName: "A", amount: 1, dueDate: "2026-01-01" })],
    }
    const got = getMonthlySummaries(grouped)
    expect(got[0].monthName).toBe("Enero")
  })
})
