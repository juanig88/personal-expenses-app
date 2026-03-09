import { describe, it, expect } from "vitest"
import { dbBillToBill } from "./bill"
import type { BillRow } from "./bill"

describe("dbBillToBill", () => {
  it.each<{ name: string; row: BillRow; expected: Partial<Record<keyof ReturnType<typeof dbBillToBill>, unknown>> }>([
    {
      name: "happy path",
      row: {
        id: "id1",
        amount: 100,
        due_date: "2026-02-15",
        sent_date: null,
        currency: "ARS",
        external_id: "ext-1",
        status: "pending",
        user_email: "u@x.com",
        service: "Gas",
        source: null,
      },
      expected: {
        id: "id1",
        serviceName: "Gas",
        amount: 100,
        dueDate: "2026-02-15",
        sentDate: null,
        status: "pending",
      },
    },
    {
      name: "status paid",
      row: {
        id: "id2",
        amount: 50,
        due_date: "2026-01-01",
        sent_date: null,
        currency: null,
        external_id: null,
        status: "paid",
        user_email: "u@x.com",
        service: "Water",
        source: null,
      },
      expected: { status: "paid", currency: undefined },
    },
    {
      name: "status overdue",
      row: {
        id: "id3",
        amount: 200,
        due_date: "2025-12-01",
        sent_date: "2025-11-28T00:00:00Z",
        currency: "ARS",
        external_id: null,
        status: "overdue",
        user_email: "u@x.com",
        service: "Rent",
        source: null,
      },
      expected: { status: "overdue", sentDate: "2025-11-28" },
    },
    {
      name: "unknown status defaults to pending",
      row: {
        id: "id4",
        amount: 0,
        due_date: "2026-01-15",
        sent_date: null,
        currency: null,
        external_id: null,
        status: "unknown",
        user_email: "u@x.com",
        service: "Other",
        source: null,
      },
      expected: { status: "pending" },
    },
  ])("$name", ({ row, expected }) => {
    const got = dbBillToBill(row)
    for (const [k, v] of Object.entries(expected)) {
      expect(got[k as keyof typeof got]).toEqual(v)
    }
    expect(got.id).toBe(row.id)
    expect(got.serviceName).toBe(row.service)
    expect(got.amount).toBe(Number(row.amount))
    expect(got.dueDate).toBe(row.due_date)
    expect(got.type).toBe("other")
  })
})
