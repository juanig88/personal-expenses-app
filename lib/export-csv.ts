import type { MonthSummary } from "@/services/billingService"

function escapeCsvField(value: string): string {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Build CSV content: one row per income (per month) and per expense (bill).
 * Columns: month (YYYY-MM), type (Income/Expense), description, amount.
 */
export function buildExportCsv(
  summaries: MonthSummary[],
  headers: { month: string; type: string; description: string; amount: string },
  typeIncome: string,
  typeExpense: string,
  incomeLabel: string
): string {
  const rows: string[][] = []
  const sorted = [...summaries].sort((a, b) => a.key.localeCompare(b.key))

  for (const s of sorted) {
    if (s.monthlyIncome > 0) {
      rows.push([
        s.key,
        typeIncome,
        incomeLabel,
        String(s.monthlyIncome),
      ])
    }
    for (const bill of s.bills ?? []) {
      rows.push([
        s.key,
        typeExpense,
        escapeCsvField(bill.serviceName),
        String(bill.amount),
      ])
    }
  }

  const headerRow = [headers.month, headers.type, headers.description, headers.amount]
    .map(escapeCsvField)
    .join(",")
  const dataRows = rows.map((cells) => cells.map(escapeCsvField).join(",")).join("\n")

  return [headerRow, dataRows].filter(Boolean).join("\n")
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
