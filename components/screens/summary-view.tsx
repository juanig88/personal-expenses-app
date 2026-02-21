"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/bottom-nav"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import {
  getAllBills,
  groupBillsByMonth,
  getMonthlySummaries,
  getMonthlyIncomesByKeys,
  type MonthSummary,
} from "@/services/billingService"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface SummaryViewProps {
  userEmail: string
  onSelectMonth: (year: number, month: number) => void
  onNavigate?: (screen: "summary" | "detail") => void
  activeNav?: "summary" | "detail"
}

export function SummaryView({
  userEmail,
  onSelectMonth,
  onNavigate,
  activeNav = "summary",
}: SummaryViewProps) {
  const [summaries, setSummaries] = useState<MonthSummary[]>([])
  const [loading, setLoading] = useState(true)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAllBills(userEmail)
      .then((bills) => {
        if (cancelled) return
        const grouped = groupBillsByMonth(bills)
        const keys = Object.keys(grouped)
        return keys.length
          ? getMonthlyIncomesByKeys(userEmail, keys).then((incomeByKey) => ({ grouped, incomeByKey }))
          : Promise.resolve({ grouped, incomeByKey: {} as Record<string, number> })
      })
      .then(({ grouped, incomeByKey }) => {
        if (cancelled) return
        setSummaries(getMonthlySummaries(grouped, incomeByKey))
      })
      .catch((err) => {
        if (!cancelled) console.error(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userEmail])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-5 pb-3 pt-safe-top">
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">Resumen por mes</p>
          </div>
          <div className="flex items-center gap-1 pt-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambiar tema</span>
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pb-28 pt-2">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : summaries.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Aún no hay facturas. Sincronizá Gmail para cargar datos.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {summaries.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelectMonth(s.year, s.month)}
                className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.99]"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {s.monthName} {s.year}
                </h3>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gastos</span>
                    <span className="font-medium tabular-nums text-foreground">${formatCurrency(s.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ingreso</span>
                    <span className="font-medium tabular-nums text-foreground">${formatCurrency(s.monthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 mt-2">
                    <span className="text-muted-foreground">Saldo</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        s.difference >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      ${formatCurrency(Math.abs(s.difference))}
                      {s.difference < 0 ? " (negativo)" : ""}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav onNavigate={onNavigate} activeScreen={activeNav} />
    </div>
  )
}
