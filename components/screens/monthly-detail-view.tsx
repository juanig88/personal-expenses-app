"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Bill } from "@/types/bill"
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
import { getBillsByMonth, createBill, getMonthlyIncome, setMonthlyIncome } from "@/services/billingService"
import { formatLocaleDate } from "@/lib/date"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface MonthlyDetailViewProps {
  year: number
  month: number
  userEmail: string
  onSelectBill: (bill: Bill) => void
  onNavigate?: (screen: "summary" | "detail") => void
  activeNav?: "summary" | "detail"
  /** Ref to register refetch so parent can refresh list when returning from bill detail */
  refetchBillsRef?: React.MutableRefObject<(() => void | Promise<void>) | null>
}

export function MonthlyDetailView({
  year,
  month,
  userEmail,
  onSelectBill,
  onNavigate,
  activeNav = "detail",
  refetchBillsRef,
}: MonthlyDetailViewProps) {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [income, setIncome] = useState("")
  const [incomeLoaded, setIncomeLoaded] = useState(false)
  const [isEditingIncome, setIsEditingIncome] = useState(false)
  const [incomeSaving, setIncomeSaving] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(month)
  const [currentYear, setCurrentYear] = useState(year)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addConcepto, setAddConcepto] = useState("")
  const [addDueDate, setAddDueDate] = useState("")
  const [addAmount, setAddAmount] = useState("")
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()

  const refetch = useCallback(() => {
    setLoading(true)
    return getBillsByMonth(userEmail, currentYear, currentMonth)
      .then(setBills)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [userEmail, currentYear, currentMonth])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBillsByMonth(userEmail, currentYear, currentMonth)
      .then((data) => {
        if (!cancelled) setBills(data)
      })
      .catch((err) => {
        if (!cancelled) console.error(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userEmail, currentYear, currentMonth])

  useEffect(() => {
    if (refetchBillsRef) refetchBillsRef.current = refetch
    return () => {
      if (refetchBillsRef) refetchBillsRef.current = null
    }
  }, [refetchBillsRef, refetch])

  useEffect(() => {
    let cancelled = false
    setIncomeLoaded(false)
    getMonthlyIncome(userEmail, currentYear, currentMonth)
      .then((amount) => {
        if (!cancelled) {
          setIncome(amount != null ? String(amount) : "")
          setIncomeLoaded(true)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          setIncomeLoaded(true)
        }
      })
    return () => { cancelled = true }
  }, [userEmail, currentYear, currentMonth])

  const totalExpenses = bills.reduce((acc, b) => acc + Number(b.amount), 0)
  const incomeValue = Number.parseFloat(income.replace(/\./g, "").replace(",", ".")) || 0
  const balance = incomeValue - totalExpenses

  const handleIncomeBlur = async () => {
    setIsEditingIncome(false)
    const num = Number.parseFloat(income.replace(/\./g, "").replace(",", "."))
    const toSave = Number.isNaN(num) || num < 0 ? 0 : num
    setIncomeSaving(true)
    try {
      await setMonthlyIncome(userEmail, currentYear, currentMonth, toSave)
      if (Number.isNaN(num) || num < 0) setIncome("")
    } catch (err) {
      console.error(err)
    } finally {
      setIncomeSaving(false)
    }
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const openAddModal = () => {
    const day = "15"
    const dueDefault = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${day}`
    setAddConcepto("")
    setAddDueDate(dueDefault)
    setAddAmount("")
    setAddError(null)
    setShowAddModal(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    const amountNum = parseFloat(addAmount.replace(",", ".").replace(/\s/g, ""))
    if (!addConcepto.trim()) {
      setAddError("Escribí el concepto.")
      return
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setAddError("El importe debe ser mayor a 0.")
      return
    }
    if (!addDueDate) {
      setAddError("Elegí la fecha de vencimiento.")
      return
    }
    setAddSaving(true)
    try {
      await createBill(userEmail, {
        service: addConcepto.trim(),
        amount: amountNum,
        due_date: addDueDate,
      })
      await refetch()
      setShowAddModal(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Error al guardar.")
    } finally {
      setAddSaving(false)
    }
  }

  const handleIncomeChange = (value: string) => {
    // Solo dígitos y una coma decimal, para que backspace borre bien (no formatear mientras edita)
    const onlyDigitsAndComma = value.replace(/[^\d,]/g, "")
    const firstComma = onlyDigitsAndComma.indexOf(",")
    const hasComma = firstComma !== -1
    const cleaned = hasComma
      ? onlyDigitsAndComma.slice(0, firstComma) + "," + onlyDigitsAndComma.slice(firstComma + 1).replace(/,/g, "")
      : onlyDigitsAndComma
    setIncome(cleaned)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-5 pb-3 pt-safe-top">
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">Detalle mensual</p>
          </div>
          <div className="flex items-center gap-1 pt-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={toggleTheme}>
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambiar tema</span>
            </Button>
            <UserMenu />
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 px-5 pb-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Mes anterior</span>
          </Button>
          <h1 className="min-w-[160px] text-center text-xl font-semibold text-foreground">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h1>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={goToNextMonth}>
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Mes siguiente</span>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-28">
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="income" className="text-sm font-medium text-muted-foreground">
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
              {!incomeLoaded ? (
                <span className="text-2xl font-bold text-muted-foreground">—</span>
              ) : isEditingIncome ? (
                <Input
                  id="income"
                  type="text"
                  inputMode="decimal"
                  value={income}
                  onChange={(e) => handleIncomeChange(e.target.value)}
                  onBlur={handleIncomeBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }}
                  className="h-auto border-0 bg-transparent p-0 text-2xl font-bold text-card-foreground focus-visible:ring-0"
                  autoFocus
                  disabled={incomeSaving}
                />
              ) : (
                <span
                  className="cursor-pointer text-2xl font-bold text-card-foreground"
                  onClick={() => setIsEditingIncome(true)}
                >
                  {income === "" ? "—" : formatCurrency(Number.parseFloat(income.replace(/\./g, "").replace(",", ".")) || 0)}
                </span>
              )}
              {incomeSaving && <span className="text-xs text-muted-foreground">Guardando…</span>}
              <span className="text-sm text-muted-foreground">ARS</span>
            </div>
          </div>
        </section>

        <section className="mb-6 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Gastos del mes</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground"
              onClick={openAddModal}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span>Concepto</span>
              <span className="w-20 text-center">Vence</span>
              <span className="w-24 text-right">Importe</span>
              <span className="w-10 text-center" />
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando...</div>
              ) : bills.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin gastos este mes</div>
              ) : (
                bills.map((bill) => (
                  <button
                    key={bill.id}
                    type="button"
                    className="grid w-full grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 active:bg-muted/50 items-center"
                    onClick={() => onSelectBill(bill)}
                  >
                    <span className="min-w-0 line-clamp-2 wrap-break-word text-sm font-medium text-card-foreground">{bill.serviceName}</span>
                    <span className="w-20 shrink-0 text-center text-sm text-muted-foreground tabular-nums">{formatLocaleDate(bill.dueDate)}</span>
                    <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-card-foreground">
                      ${formatCurrency(bill.amount)}
                    </span>
                    <span className="flex w-10 shrink-0 items-center justify-center">
                      {bill.status === "paid" ? (
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
                ))
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Total de gastos</span>
            <span className="text-base font-semibold tabular-nums text-card-foreground">
              ${formatCurrency(totalExpenses)}
            </span>
          </div>
          <div
            className={`flex items-center justify-between rounded-xl px-4 py-4 ${
              balance >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"
            }`}
          >
            <span
              className={`text-sm font-medium ${
                balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
              }`}
            >
              {balance >= 0 ? "Saldo disponible" : "Saldo negativo"}
            </span>
            <span
              className={`text-xl font-bold tabular-nums ${
                balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
              }`}
            >
              ${formatCurrency(Math.abs(balance))}
            </span>
          </div>
        </section>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Nuevo gasto</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label htmlFor="add-concepto" className="mb-1 block text-sm font-medium text-muted-foreground">
                  Concepto
                </label>
                <Input
                  id="add-concepto"
                  value={addConcepto}
                  onChange={(e) => setAddConcepto(e.target.value)}
                  placeholder="Ej. Alquiler, Luz..."
                  className="bg-background"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="add-due" className="mb-1 block text-sm font-medium text-muted-foreground">
                  Vence
                </label>
                <Input
                  id="add-due"
                  type="date"
                  value={addDueDate}
                  onChange={(e) => setAddDueDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div>
                <label htmlFor="add-amount" className="mb-1 block text-sm font-medium text-muted-foreground">
                  Importe ($)
                </label>
                <Input
                  id="add-amount"
                  type="text"
                  inputMode="decimal"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0"
                  className="bg-background"
                />
              </div>
              {addError && (
                <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                  disabled={addSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={addSaving}>
                  {addSaving ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav onNavigate={onNavigate} activeScreen={activeNav} />
    </div>
  )
}
