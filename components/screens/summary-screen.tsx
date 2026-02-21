"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface SummaryScreenProps {
  onSelectMonth: (month: number, year: number) => void
  onBack: () => void
}

interface MonthData {
  month: number
  year: number
  income: number
  expenses: number
}

// Mock data for 2026
const mockYearData: Record<number, MonthData[]> = {
  2025: [
    { month: 0, year: 2025, income: 780000, expenses: 620000 },
    { month: 1, year: 2025, income: 780000, expenses: 595000 },
    { month: 2, year: 2025, income: 800000, expenses: 710000 },
    { month: 3, year: 2025, income: 800000, expenses: 680000 },
    { month: 4, year: 2025, income: 820000, expenses: 750000 },
    { month: 5, year: 2025, income: 820000, expenses: 690000 },
    { month: 6, year: 2025, income: 850000, expenses: 720000 },
    { month: 7, year: 2025, income: 850000, expenses: 680000 },
    { month: 8, year: 2025, income: 850000, expenses: 810000 },
    { month: 9, year: 2025, income: 850000, expenses: 740000 },
    { month: 10, year: 2025, income: 850000, expenses: 920000 },
    { month: 11, year: 2025, income: 900000, expenses: 850000 },
  ],
  2026: [
    { month: 0, year: 2026, income: 850000, expenses: 420000 },
    { month: 1, year: 2026, income: 850000, expenses: 390908.66 },
    { month: 2, year: 2026, income: 0, expenses: 0 },
    { month: 3, year: 2026, income: 0, expenses: 0 },
    { month: 4, year: 2026, income: 0, expenses: 0 },
    { month: 5, year: 2026, income: 0, expenses: 0 },
    { month: 6, year: 2026, income: 0, expenses: 0 },
    { month: 7, year: 2026, income: 0, expenses: 0 },
    { month: 8, year: 2026, income: 0, expenses: 0 },
    { month: 9, year: 2026, income: 0, expenses: 0 },
    { month: 10, year: 2026, income: 0, expenses: 0 },
    { month: 11, year: 2026, income: 0, expenses: 0 },
  ],
}

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SummaryScreen({ onSelectMonth, onBack }: SummaryScreenProps) {
  const [currentYear, setCurrentYear] = useState(2026)

  const yearData = mockYearData[currentYear] || []

  // Calculate year totals
  const yearTotals = yearData.reduce(
    (acc, month) => ({
      income: acc.income + month.income,
      expenses: acc.expenses + month.expenses,
    }),
    { income: 0, expenses: 0 }
  )
  const yearBalance = yearTotals.income - yearTotals.expenses

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-5 pb-3 pt-safe-top">
          <div className="pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 rounded-xl px-3 text-muted-foreground"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>

        {/* Year selector */}
        <div className="flex items-center justify-center gap-4 px-5 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setCurrentYear(currentYear - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Ano anterior</span>
          </Button>
          <h1 className="min-w-[100px] text-center text-2xl font-bold text-foreground">
            {currentYear}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setCurrentYear(currentYear + 1)}
          >
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Ano siguiente</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col px-5 pb-8">
        {/* Year summary card */}
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Resumen del ano
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ingresos</span>
                <span className="font-medium tabular-nums text-card-foreground">
                  ${formatCurrency(yearTotals.income)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gastos</span>
                <span className="font-medium tabular-nums text-card-foreground">
                  ${formatCurrency(yearTotals.expenses)}
                </span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Balance
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      yearBalance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {yearBalance >= 0 ? "+" : ""}${formatCurrency(yearBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Months list */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Meses
          </h2>
          <div className="space-y-2">
            {yearData.map((monthData) => {
              const balance = monthData.income - monthData.expenses
              const isEmpty = monthData.income === 0 && monthData.expenses === 0

              return (
                <button
                  key={monthData.month}
                  type="button"
                  onClick={() => onSelectMonth(monthData.month, monthData.year)}
                  disabled={isEmpty}
                  className={`w-full rounded-xl border bg-card p-4 text-left transition-colors ${
                    isEmpty
                      ? "cursor-not-allowed border-border/50 opacity-50"
                      : "border-border hover:border-border hover:bg-muted/30 active:bg-muted/50"
                  }`}
                >
                  {/* Month header */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold text-card-foreground">
                      {months[monthData.month]} {monthData.year}
                    </span>
                    {!isEmpty && (
                      <span
                        className={`flex items-center gap-1 text-xs font-medium ${
                          balance > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : balance < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {balance > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : balance < 0 ? (
                          <TrendingDown className="h-3.5 w-3.5" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                        {balance >= 0 ? "+" : ""}
                        {formatCurrency(balance)}
                      </span>
                    )}
                  </div>

                  {/* Month details */}
                  {isEmpty ? (
                    <p className="text-sm text-muted-foreground">
                      Sin datos todavia
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                        <p className="font-medium tabular-nums text-card-foreground">
                          ${formatCurrency(monthData.income)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gastos</p>
                        <p className="font-medium tabular-nums text-card-foreground">
                          ${formatCurrency(monthData.expenses)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Saldo</p>
                        <p
                          className={`font-medium tabular-nums ${
                            balance >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          ${formatCurrency(Math.abs(balance))}
                        </p>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
