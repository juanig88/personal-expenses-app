/**
 * Composition root: wires infrastructure (Supabase repo) with application use cases.
 * Exports the same API so components and routes keep importing from @/services/billingService.
 * No use case logic here; no direct Supabase in application layer.
 */
import { createSupabaseBillsRepository } from "@/infrastructure/supabaseBillsRepository"
import * as useCases from "@/application/bills/useCases"
import type { CreateBillPayload, UpdateBillPayload } from "@/application/ports/billsRepository"

const repo = createSupabaseBillsRepository()

export function getBillsByMonth(userEmail: string, year: number, month: number) {
  return useCases.getBillsByMonth(repo, userEmail, year, month)
}

export async function getAllBills(userEmail: string) {
  return useCases.getAllBills(repo, userEmail)
}

export async function createBill(
  userEmail: string,
  payload: CreateBillPayload
) {
  return useCases.createBill(repo, userEmail, payload)
}

export async function updateBill(billId: string, payload: UpdateBillPayload) {
  return useCases.updateBill(repo, billId, payload)
}

export async function deleteBill(billId: string): Promise<void> {
  return useCases.deleteBill(repo, billId)
}

export async function getMonthlyIncome(
  userEmail: string,
  year: number,
  month: number
): Promise<number | null> {
  return useCases.getMonthlyIncome(repo, userEmail, year, month)
}

export async function setMonthlyIncome(
  userEmail: string,
  year: number,
  month: number,
  amount: number
): Promise<void> {
  return useCases.setMonthlyIncome(repo, userEmail, year, month, amount)
}

export async function getMonthlyIncomesByKeys(
  userEmail: string,
  keys: string[]
): Promise<Record<string, number>> {
  return useCases.getMonthlyIncomesByKeys(repo, userEmail, keys)
}

export async function copyPreviousMonthBills(
  userEmail: string,
  currentYear: number,
  currentMonth: number
) {
  return useCases.copyPreviousMonthBills(repo, userEmail, currentYear, currentMonth)
}

export { groupBillsByMonth, getMonthlySummaries } from "@/application/bills/useCases"
export type { CopyPreviousMonthResult, MonthSummary } from "@/application/bills/useCases"
export type { CreateBillPayload, UpdateBillPayload } from "@/application/ports/billsRepository"
