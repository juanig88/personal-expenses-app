import type { Bill } from "@/domain/bill"

/** DTO for creating a bill (application layer). */
export interface CreateBillPayload {
  service: string
  amount: number
  due_date: string
  currency?: string
}

/** DTO for updating a bill (application layer). */
export interface UpdateBillPayload {
  amount?: number
  status?: "pending" | "paid" | "overdue"
  service?: string
  due_date?: string
}

/**
 * Port for bill and monthly income persistence.
 * Implemented by infrastructure (e.g. Supabase); used by application use cases.
 */
export interface IBillsRepository {
  getBillsByMonth(userEmail: string, year: number, month: number): Promise<Bill[]>
  getAllBills(userEmail: string): Promise<Bill[]>
  createBill(userEmail: string, payload: CreateBillPayload): Promise<Bill>
  updateBill(billId: string, payload: UpdateBillPayload): Promise<Bill>
  deleteBill(billId: string): Promise<void>
  getMonthlyIncome(userEmail: string, year: number, month: number): Promise<number | null>
  setMonthlyIncome(userEmail: string, year: number, month: number, amount: number): Promise<void>
  getMonthlyIncomesByKeys(userEmail: string, keys: string[]): Promise<Record<string, number>>
}
