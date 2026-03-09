import type { Bill } from "@/domain/bill"

export type { Bill }

/**
 * Bill as stored in Supabase (bills table). Infrastructure persistence shape.
 * due_date: fecha de vencimiento; sent_date: fecha del correo (opcional).
 */
export interface BillRow {
  id: string
  created_at?: string
  amount: number
  due_date: string
  sent_date: string | null
  currency: string | null
  external_id: string | null
  status: string
  user_email: string
  service: string
  source: string | null
}

/**
 * Map a DB row to the domain Bill entity. Used by infrastructure adapters.
 */
export function dbBillToBill(row: BillRow): Bill {
  const status =
    row.status === "paid" || row.status === "overdue"
      ? row.status
      : "pending"
  const sent = row.sent_date
    ? new Date(row.sent_date).toISOString().slice(0, 10)
    : null
  return {
    id: row.id,
    serviceName: row.service,
    amount: Number(row.amount),
    currency: row.currency ?? undefined,
    dueDate: row.due_date,
    sentDate: sent,
    status: status as Bill["status"],
    type: "other",
  }
}
