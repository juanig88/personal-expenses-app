import type { Bill } from "@/domain/bill"
import type { IBillsRepository, CreateBillPayload, UpdateBillPayload } from "@/application/ports/billsRepository"

/** Normalize service name for duplicate check (trim + lowercase). */
function normalizeServiceKey(service: string): string {
  return service.trim().toLowerCase()
}

/** Due date in current year/month, same day as refDate (YYYY-MM-DD); if day is beyond month end, use last day. */
function dueDateInMonth(year: number, month: number, refDate: string): string {
  const [, , dayStr] = refDate.split("-")
  const day = Math.min(parseInt(dayStr, 10) || 1, 31)
  const lastDay = new Date(year, month, 0).getDate()
  const d = Math.min(day, lastDay)
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export async function getBillsByMonth(
  repo: IBillsRepository,
  userEmail: string,
  year: number,
  month: number
): Promise<Bill[]> {
  return repo.getBillsByMonth(userEmail, year, month)
}

export async function getAllBills(repo: IBillsRepository, userEmail: string): Promise<Bill[]> {
  return repo.getAllBills(userEmail)
}

export async function createBill(
  repo: IBillsRepository,
  userEmail: string,
  payload: CreateBillPayload
): Promise<Bill> {
  return repo.createBill(userEmail, payload)
}

export async function updateBill(
  repo: IBillsRepository,
  billId: string,
  payload: UpdateBillPayload
): Promise<Bill> {
  return repo.updateBill(billId, payload)
}

export async function deleteBill(repo: IBillsRepository, billId: string): Promise<void> {
  return repo.deleteBill(billId)
}

export async function getMonthlyIncome(
  repo: IBillsRepository,
  userEmail: string,
  year: number,
  month: number
): Promise<number | null> {
  return repo.getMonthlyIncome(userEmail, year, month)
}

export async function setMonthlyIncome(
  repo: IBillsRepository,
  userEmail: string,
  year: number,
  month: number,
  amount: number
): Promise<void> {
  return repo.setMonthlyIncome(userEmail, year, month, amount)
}

export async function getMonthlyIncomesByKeys(
  repo: IBillsRepository,
  userEmail: string,
  keys: string[]
): Promise<Record<string, number>> {
  return repo.getMonthlyIncomesByKeys(userEmail, keys)
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
  repo: IBillsRepository,
  userEmail: string,
  currentYear: number,
  currentMonth: number
): Promise<CopyPreviousMonthResult> {
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const [prevBills, currentBills] = await Promise.all([
    repo.getBillsByMonth(userEmail, prevYear, prevMonth),
    repo.getBillsByMonth(userEmail, currentYear, currentMonth),
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
    await repo.createBill(userEmail, {
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
 * Group bills by month (YYYY-MM) using due_date.
 * Pure domain logic; no repository.
 */
export function groupBillsByMonth(bills: Bill[]): Record<string, Bill[]> {
  return bills.reduce<Record<string, Bill[]>>((acc, bill) => {
    const key = bill.dueDate.slice(0, 7)
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
 * Build summary data per month from grouped bills. Pure; no repository.
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
