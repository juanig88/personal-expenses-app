import { supabase } from "@/lib/supabase"
import type { BillRow } from "@/types/bill"
import { dbBillToBill } from "@/types/bill"
import type {
  IBillsRepository,
  CreateBillPayload,
  UpdateBillPayload,
} from "@/application/ports/billsRepository"

const MAX_SERVICE_LENGTH = 500
const AMOUNT_MIN = 0
const AMOUNT_MAX = 1e12
const DUE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const VALID_STATUSES = new Set(["pending", "paid", "overdue"])

function validateCreatePayload(payload: CreateBillPayload): void {
  if (typeof payload.service !== "string" || payload.service.length > MAX_SERVICE_LENGTH) {
    throw new Error("Invalid service name")
  }
  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
    throw new Error("Invalid amount")
  }
  if (typeof payload.due_date !== "string" || !DUE_DATE_REGEX.test(payload.due_date)) {
    throw new Error("Invalid due_date (expected YYYY-MM-DD)")
  }
}

function validateUpdatePayload(payload: UpdateBillPayload): void {
  if (payload.service != null && (typeof payload.service !== "string" || payload.service.length > MAX_SERVICE_LENGTH)) {
    throw new Error("Invalid service name")
  }
  if (payload.amount != null) {
    const amount = Number(payload.amount)
    if (!Number.isFinite(amount) || amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
      throw new Error("Invalid amount")
    }
  }
  if (payload.due_date != null && (typeof payload.due_date !== "string" || !DUE_DATE_REGEX.test(payload.due_date))) {
    throw new Error("Invalid due_date (expected YYYY-MM-DD)")
  }
  if (payload.status != null && !VALID_STATUSES.has(payload.status)) {
    throw new Error("Invalid status")
  }
}

function validateBillId(billId: string): void {
  if (typeof billId !== "string" || billId.length < 1 || billId.length > 128) {
    throw new Error("Invalid bill id")
  }
}

/**
 * Supabase implementation of IBillsRepository.
 * Infrastructure adapter: persistence only; no use case logic.
 * Validates input at boundary to prevent injection and invalid data.
 */
export function createSupabaseBillsRepository(): IBillsRepository {
  return {
    async getBillsByMonth(userEmail: string, year: number, month: number) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const endDateExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`

      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("user_email", userEmail)
        .gte("due_date", startDate)
        .lt("due_date", endDateExclusive)
        .order("due_date", { ascending: true })

      if (error) throw error
      return (data ?? []).map((row) => dbBillToBill(row as BillRow))
    },

    async getAllBills(userEmail: string) {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("user_email", userEmail)
        .order("due_date", { ascending: false })

      if (error) throw error
      return (data ?? []).map((row) => dbBillToBill(row as BillRow))
    },

    async createBill(userEmail: string, payload: CreateBillPayload) {
      validateCreatePayload(payload)
      const externalId = `manual-${crypto.randomUUID()}`
      const { data, error } = await supabase
        .from("bills")
        .insert({
          user_email: userEmail,
          service: payload.service.trim() || "Sin nombre",
          amount: payload.amount,
          due_date: payload.due_date,
          currency: payload.currency ?? "ARS",
          status: "pending",
          source: "manual",
          external_id: externalId,
          sent_date: null,
        })
        .select()
        .single()

      if (error) throw error
      return dbBillToBill(data as BillRow)
    },

    async updateBill(billId: string, payload: UpdateBillPayload) {
      validateBillId(billId)
      validateUpdatePayload(payload)
      const update: Record<string, unknown> = {}
      if (payload.amount != null) update.amount = payload.amount
      if (payload.status != null) update.status = payload.status
      if (payload.service != null) update.service = payload.service
      if (payload.due_date != null) update.due_date = payload.due_date

      if (Object.keys(update).length === 0) {
        const { data } = await supabase.from("bills").select("*").eq("id", billId).single()
        if (!data) throw new Error("Bill not found")
        return dbBillToBill(data as BillRow)
      }

      const { data, error } = await supabase
        .from("bills")
        .update(update)
        .eq("id", billId)
        .select()
        .single()

      if (error) throw error
      return dbBillToBill(data as BillRow)
    },

    async deleteBill(billId: string) {
      validateBillId(billId)
      const { error } = await supabase.from("bills").delete().eq("id", billId)
      if (error) throw error
    },

    async getMonthlyIncome(userEmail: string, year: number, month: number) {
      const { data, error } = await supabase
        .from("monthly_income")
        .select("amount")
        .eq("user_email", userEmail)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return Number(data.amount)
    },

    async setMonthlyIncome(userEmail: string, year: number, month: number, amount: number) {
      const { error } = await supabase.from("monthly_income").upsert(
        {
          user_email: userEmail,
          year,
          month,
          amount,
          currency: "ARS",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_email,year,month" }
      )
      if (error) throw error
    },

    async getMonthlyIncomesByKeys(userEmail: string, keys: string[]) {
      if (keys.length === 0) return {}
      const keySet = new Set(keys)
      const { data, error } = await supabase
        .from("monthly_income")
        .select("year, month, amount")
        .eq("user_email", userEmail)

      if (error) throw error
      const result: Record<string, number> = {}
      for (const key of keySet) {
        result[key] = 0
      }
      for (const row of data ?? []) {
        const k = `${row.year}-${String(row.month).padStart(2, "0")}`
        if (keySet.has(k)) result[k] = Number(row.amount)
      }
      return result
    },
  }
}
