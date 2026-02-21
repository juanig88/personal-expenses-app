/**
 * Bill as stored in Supabase (bills table).
 * due_date: fecha de vencimiento (cuándo pagar); usada para agrupar por mes.
 * sent_date: fecha del correo (opcional).
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
 * Bill shape used in the UI (components, navigation).
 * dueDate: fecha de vencimiento (cuándo pagar); usada para agrupar y mostrar.
 */
export interface Bill {
  id: string
  serviceName: string
  amount: number
  currency?: string
  dueDate: string
  sentDate: string | null
  status: "pending" | "paid" | "overdue"
  type: "gas" | "electricity" | "internet" | "water" | "rent" | "other"
}

/**
 * Map a DB row to the UI Bill type.
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
