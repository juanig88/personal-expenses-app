"use client"

import { useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Bill } from "@/types/bill"
import {
  ArrowLeft,
  Check,
  Clock,
  AlertCircle,
  Mail,
  PenLine,
  X,
  Save,
  Trash2,
} from "lucide-react"
import { updateBill, deleteBill } from "@/services/billingService"
import { formatLocaleDate } from "@/lib/date"

interface BillDetailScreenProps {
  bill: Bill
  onBack: () => void
  /** Called after update/delete so parent can refetch the list */
  onBillUpdated?: () => void | Promise<void>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const statusConfig = {
  pending: {
    label: "Pendiente",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
  paid: {
    label: "Pagado",
    icon: Check,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
  },
  overdue: {
    label: "Vencido",
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/50",
  },
}

const typeLabels: Record<string, string> = {
  gas: "Servicio de gas",
  electricity: "Servicio eléctrico",
  internet: "Internet / Cable",
  water: "Servicio de agua",
  rent: "Alquiler",
  other: "Otro gasto",
}

export function BillDetailScreen({ bill, onBack, onBillUpdated }: BillDetailScreenProps) {
  const [currentBill, setCurrentBill] = useState(bill)
  const [isEditing, setIsEditing] = useState(false)
  const [editAmount, setEditAmount] = useState(bill.amount.toString())
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [editDueDate, setEditDueDate] = useState(bill.dueDate)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const status = statusConfig[currentBill.status]
  const StatusIcon = status.icon
  const currency = currentBill.currency || "ARS"
  const description = typeLabels[currentBill.type] || "Gasto"

  const handleMarkAsPaid = async () => {
    const newStatus = currentBill.status === "paid" ? "pending" : "paid"
    setSaving(true)
    try {
      const updated = await updateBill(currentBill.id, { status: newStatus })
      setCurrentBill(updated)
      await onBillUpdated?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAmount = async () => {
    const newAmount = parseFloat(editAmount.replace(",", "."))
    if (isNaN(newAmount) || newAmount <= 0) {
      setIsEditing(false)
      return
    }
    setSaving(true)
    try {
      const updated = await updateBill(currentBill.id, { amount: newAmount })
      setCurrentBill(updated)
      setIsEditing(false)
      await onBillUpdated?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditAmount(currentBill.amount.toString())
    setIsEditing(false)
  }

  const handleSaveDueDate = async () => {
    if (!editDueDate || editDueDate.length < 10) {
      setIsEditingDueDate(false)
      return
    }
    setSaving(true)
    try {
      const updated = await updateBill(currentBill.id, { due_date: editDueDate })
      setCurrentBill(updated)
      setIsEditingDueDate(false)
      await onBillUpdated?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEditDueDate = () => {
    setEditDueDate(currentBill.dueDate)
    setIsEditingDueDate(false)
  }

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este gasto? No se puede deshacer.")) return
    setDeleting(true)
    try {
      await deleteBill(currentBill.id)
      await onBillUpdated?.()
      onBack()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="flex h-14 items-center gap-3 px-4 pt-safe-top">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Volver</span>
          </Button>
          <h1 className="flex-1 text-base font-semibold text-foreground">
            Detalle del gasto
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col">
        {/* Data rows */}
        <div className="divide-y divide-border border-b border-border">
          {/* Service name */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-muted-foreground">Servicio</span>
            <span className="font-medium text-foreground">
              {currentBill.serviceName}
            </span>
          </div>

          {/* Description */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-muted-foreground">Descripción</span>
            <span className="text-sm text-foreground">{description}</span>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-muted-foreground">Monto</span>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editAmount}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditAmount(e.target.value)
                  }
                  className="h-8 w-32 text-right font-medium"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">{currency}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-emerald-600"
                  onClick={handleSaveAmount}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <span className="text-lg font-semibold tabular-nums text-foreground">
                ${formatCurrency(currentBill.amount)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {currency}
                </span>
              </span>
            )}
          </div>

          {/* Due date */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-muted-foreground">Vence el</span>
            {isEditingDueDate ? (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditDueDate(e.target.value)
                  }
                  className="h-8 w-36 font-medium"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-emerald-600"
                  onClick={handleSaveDueDate}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={handleCancelEditDueDate}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <span className="font-medium tabular-nums text-foreground">
                {formatLocaleDate(currentBill.dueDate)}
              </span>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-muted-foreground">Estado</span>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${status.bg} ${status.color}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </div>
          </div>

          {/* Source */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-muted-foreground">Origen</span>
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Detectado desde tu email
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 p-4">
          <Button
            variant={currentBill.status === "paid" ? "outline" : "default"}
            className="h-12 gap-2 rounded-xl font-medium"
            onClick={handleMarkAsPaid}
            disabled={saving || deleting}
          >
            <Check className="h-4 w-4" />
            {currentBill.status === "paid"
              ? "Marcar como pendiente"
              : "Marcar como pagado"}
          </Button>

          <Button
            variant="outline"
            className="h-12 gap-2 rounded-xl font-medium bg-transparent"
            onClick={() => {
              setEditAmount(currentBill.amount.toString())
              setIsEditing(true)
            }}
            disabled={isEditing || isEditingDueDate || saving || deleting}
          >
            <PenLine className="h-4 w-4" />
            Editar monto
          </Button>

          <Button
            variant="outline"
            className="h-12 gap-2 rounded-xl font-medium bg-transparent"
            onClick={() => {
              setEditDueDate(currentBill.dueDate)
              setIsEditingDueDate(true)
            }}
            disabled={isEditing || isEditingDueDate || saving || deleting}
          >
            <PenLine className="h-4 w-4" />
            Editar fecha de vencimiento
          </Button>

          <Button
            variant="outline"
            className="h-12 gap-2 rounded-xl font-medium border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </main>
    </div>
  )
}
