/**
 * Domain entity: Bill (gasto / factura a pagar).
 * dueDate: fecha de vencimiento (cuándo pagar); usada para agrupar y mostrar.
 * No external dependencies.
 */
export type BillStatus = "pending" | "paid" | "overdue"
export type BillType = "gas" | "electricity" | "internet" | "water" | "rent" | "other"

export interface Bill {
  id: string
  serviceName: string
  amount: number
  currency?: string
  dueDate: string
  sentDate: string | null
  status: BillStatus
  type: BillType
}
