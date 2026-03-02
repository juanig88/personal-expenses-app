import { supabase } from "@/lib/supabase"
import type { Bill, BillRow } from "@/types/bill"
import { dbBillToBill } from "@/types/bill"

/**
 * Fetch bills for a given month by due_date (fecha de vencimiento / cuándo pagar).
 */
export async function getBillsByMonth(
  userEmail: string,
  year: number,
  month: number
): Promise<Bill[]> {
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
}

/** Normalize service name for duplicate check (trim + lowercase). */
function normalizeServiceKey(service: string): string {
  return service.trim().toLowerCase()
}

/**
 * Due date in current year/month, same day as refDate (YYYY-MM-DD); if day is beyond month end, use last day.
 */
function dueDateInMonth(year: number, month: number, refDate: string): string {
  const [, , dayStr] = refDate.split("-")
  const day = Math.min(parseInt(dayStr, 10) || 1, 31)
  const lastDay = new Date(year, month, 0).getDate()
  const d = Math.min(day, lastDay)
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export interface CopyPreviousMonthResult {
  created: number
  skipped: number
}

/**
 * Copy bills from the previous month into the current month. Creates only concepts
 * that don't already exist in the current month (by service name, case-insensitive).
 */
export async function copyPreviousMonthBills(
  userEmail: string,
  currentYear: number,
  currentMonth: number
): Promise<CopyPreviousMonthResult> {
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const [prevBills, currentBills] = await Promise.all([
    getBillsByMonth(userEmail, prevYear, prevMonth),
    getBillsByMonth(userEmail, currentYear, currentMonth),
  ])

  const currentServices = new Set(currentBills.map((b) => normalizeServiceKey(b.serviceName)))
  let created = 0
  let skipped = 0

  for (const bill of prevBills) {
    const key = normalizeServiceKey(bill.serviceName)
    if (currentServices.has(key)) {
      skipped += 1
      continue
    }
    const dueDate = dueDateInMonth(currentYear, currentMonth, bill.dueDate)
    await createBill(userEmail, {
      service: bill.serviceName,
      amount: bill.amount,
      due_date: dueDate,
      currency: bill.currency ?? "ARS",
    })
    created += 1
    currentServices.add(key)
  }

  return { created, skipped }
}

/**
 * Fetch all bills for the user (for summary view).
 */
export async function getAllBills(userEmail: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("user_email", userEmail)
    .order("due_date", { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => dbBillToBill(row as BillRow))
}

export interface CreateBillPayload {
  service: string
  amount: number
  due_date: string // YYYY-MM-DD
  currency?: string
}

/**
 * Create a manual bill. Uses source "manual" and a unique external_id.
 */
export async function createBill(
  userEmail: string,
  payload: CreateBillPayload
): Promise<Bill> {
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
}

export interface UpdateBillPayload {
  amount?: number
  status?: "pending" | "paid" | "overdue"
  service?: string
  due_date?: string
}

/**
 * Update a bill by id.
 */
export async function updateBill(
  billId: string,
  payload: UpdateBillPayload
): Promise<Bill> {
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
}

/**
 * Delete a bill by id.
 */
export async function deleteBill(billId: string): Promise<void> {
  const { error } = await supabase.from("bills").delete().eq("id", billId)
  if (error) throw error
}

/**
 * Get stored monthly income for one month. Returns null if not set.
 */
export async function getMonthlyIncome(
  userEmail: string,
  year: number,
  month: number
): Promise<number | null> {
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
}

/**
 * Set (upsert) monthly income for one month.
 */
export async function setMonthlyIncome(
  userEmail: string,
  year: number,
  month: number,
  amount: number
): Promise<void> {
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
}

/**
 * Get monthly income for many months at once. Keys are "YYYY-MM".
 * Returns record key -> amount; missing keys mean no income stored (treat as 0 for balance).
 */
export async function getMonthlyIncomesByKeys(
  userEmail: string,
  keys: string[]
): Promise<Record<string, number>> {
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
}

/**
 * Group bills by month (YYYY-MM) using due_date (fecha de vencimiento).
 * Usamos el string dueDate (YYYY-MM-DD) para evitar zona horaria: new Date("2026-02-01") en UTC
 * pasa a enero en Argentina y agrupa mal.
 */
export function groupBillsByMonth(
  bills: Bill[]
): Record<string, Bill[]> {
  return bills.reduce<Record<string, Bill[]>>((acc, bill) => {
    const key = bill.dueDate.slice(0, 7) // "2026-02-01" -> "2026-02"
    if (!acc[key]) acc[key] = []
    acc[key].push(bill)
    return acc
  }, {})
}

export interface MonthSummary {
  key: string
  year: number
  month: number
  monthName: string
  totalExpenses: number
  monthlyIncome: number
  difference: number
  bills: Bill[]
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

/**
 * Build summary data per month from grouped bills.
 * incomeByKey: optional map "YYYY-MM" -> amount; if missing for a month, income is 0 (saldo = -gastos).
 */
export function getMonthlySummaries(
  grouped: Record<string, Bill[]>,
  incomeByKey: Record<string, number> = {}
): MonthSummary[] {
  const keys = Object.keys(grouped).sort().reverse()
  return keys.map((key) => {
    const [y, m] = key.split("-").map(Number)
    const bills = grouped[key] ?? []
    const totalExpenses = bills.reduce((acc, b) => acc + Number(b.amount), 0)
    const monthlyIncome = incomeByKey[key] ?? 0
    const difference = monthlyIncome - totalExpenses
    return {
      key,
      year: y,
      month: m,
      monthName: MONTH_NAMES[m - 1],
      totalExpenses,
      monthlyIncome,
      difference,
      bills,
    }
  })
}
