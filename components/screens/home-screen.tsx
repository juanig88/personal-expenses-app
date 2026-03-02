"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Bill } from "@/components/bill-card"
import { BottomNav } from "@/components/bottom-nav"
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Check,
  Clock,
  Plus,
  Pencil,
} from "lucide-react"
import { useTheme } from "next-themes"
import { UserMenu } from "@/components/user-menu"

interface HomeScreenProps {
  onSelectBill: (bill: Bill) => void
}

interface Expense {
  id: string
  description: string
  dueDate: string
  amount: number
  status: "ok" | "pending"
  type: "gas" | "electricity" | "internet" | "water" | "rent" | "insurance" | "other"
}

// Mock data for February 2026
const mockExpenses: Expense[] = [
  {
    id: "1",
    description: "Ecogas",
    dueDate: "2026-02-02",
    amount: 12459.66,
    status: "pending",
    type: "gas",
  },
  {
    id: "2",
    description: "Edenor (Luz)",
    dueDate: "2026-02-10",
    amount: 28750.0,
    status: "pending",
    type: "electricity",
  },
  {
    id: "3",
    description: "Seguro auto",
    dueDate: "2026-02-05",
    amount: 45200.0,
    status: "ok",
    type: "insurance",
  },
  {
    id: "4",
    description: "Telecentro",
    dueDate: "2026-02-15",
    amount: 15999.0,
    status: "ok",
    type: "internet",
  },
  {
    id: "5",
    description: "Agua (AySA)",
    dueDate: "2026-02-20",
    amount: 8500.0,
    status: "pending",
    type: "water",
  },
  {
    id: "6",
    description: "Alquiler",
    dueDate: "2026-02-01",
    amount: 280000.0,
    status: "ok",
    type: "rent",
  },
]

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  })
}

export function HomeScreen({ onSelectBill }: HomeScreenProps) {
  const [currentMonth, setCurrentMonth] = useState(1) // February (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026)
  const [income, setIncome] = useState("850000")
  const [isEditingIncome, setIsEditingIncome] = useState(false)
  const { theme, setTheme } = useTheme()

  const expenses = mockExpenses
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0)
  const incomeValue = Number.parseFloat(income.replace(/\./g, "").replace(",", ".")) || 0
  const remaining = incomeValue - totalExpenses

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleIncomeChange = (value: string) => {
    // Only allow numbers and formatting characters
    const cleaned = value.replace(/[^\d]/g, "")
    setIncome(cleaned)
  }

  const handleSelectExpense = (expense: Expense) => {
    // Convert to Bill type for navigation
    const bill: Bill = {
      id: expense.id,
      serviceName: expense.description,
      amount: expense.amount,
      currency: "ARS",
      dueDate: expense.dueDate,
      sentDate: null,
      status: expense.status === "ok" ? "paid" : "pending",
      type: expense.type === "insurance" ? "other" : expense.type,
    }
    onSelectBill(bill)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-5 pb-3 pt-safe-top">
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">Resumen mensual</p>
          </div>
          <div className="flex items-center gap-1 pt-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={toggleTheme}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambiar tema</span>
            </Button>
            <UserMenu />
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center gap-4 px-5 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Mes anterior</span>
          </Button>
          <h1 className="min-w-[160px] text-center text-xl font-semibold text-foreground">
            {months[currentMonth]} {currentYear}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Mes siguiente</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col px-5 pb-28">
        {/* Income section */}
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <label
                htmlFor="income"
                className="text-sm font-medium text-muted-foreground"
              >
                Cobré este mes
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0"
                onClick={() => setIsEditingIncome(!isEditingIncome)}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Editar ingreso</span>
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg text-muted-foreground">$</span>
              {isEditingIncome ? (
                <Input
                  id="income"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(Number.parseFloat(income) || 0)}
                  onChange={(e) => handleIncomeChange(e.target.value)}
                  onBlur={() => setIsEditingIncome(false)}
                  className="h-auto border-0 bg-transparent p-0 text-2xl font-bold text-card-foreground focus-visible:ring-0"
                  autoFocus
                />
              ) : (
                <span
                  className="cursor-pointer text-2xl font-bold text-card-foreground"
                  onClick={() => setIsEditingIncome(true)}
                >
                  {formatCurrency(Number.parseFloat(income) || 0)}
                </span>
              )}
              <span className="text-sm text-muted-foreground">ARS</span>
            </div>
          </div>
        </section>

        {/* Expenses section */}
        <section className="mb-6 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Gastos del mes
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>

          {/* Expense list - spreadsheet style */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span>Concepto</span>
              <span className="w-14 text-center">Vence</span>
              <span className="w-24 text-right">Importe</span>
              <span className="w-10 text-center" />
            </div>

            {/* Expense rows */}
            <div className="divide-y divide-border">
              {expenses.map((expense) => (
                <button
                  key={expense.id}
                  type="button"
                  className="grid w-full grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 active:bg-muted/50 items-center"
                  onClick={() => handleSelectExpense(expense)}
                >
                  <span className="min-w-0 line-clamp-2 wrap-break-word text-sm font-medium text-card-foreground">
                    {expense.description}
                  </span>
                  <span className="w-14 shrink-0 text-center text-sm text-muted-foreground">
                    {formatDate(expense.dueDate)}
                  </span>
                  <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-card-foreground">
                    ${formatCurrency(expense.amount)}
                  </span>
                  <span className="flex w-10 shrink-0 items-center justify-center">
                    {expense.status === "ok" ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom summary */}
        <section className="space-y-3">
          {/* Total expenses */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">
              Total de gastos
            </span>
            <span className="text-base font-semibold tabular-nums text-card-foreground">
              ${formatCurrency(totalExpenses)}
            </span>
          </div>

          {/* Remaining balance */}
          <div
            className={`flex items-center justify-between rounded-xl px-4 py-4 ${
              remaining >= 0
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : "bg-red-50 dark:bg-red-950/30"
            }`}
          >
            <span
              className={`text-sm font-medium ${
                remaining >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {remaining >= 0 ? "Saldo disponible" : "Saldo negativo"}
            </span>
            <span
              className={`text-xl font-bold tabular-nums ${
                remaining >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              ${formatCurrency(Math.abs(remaining))}
            </span>
          </div>
        </section>

      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
