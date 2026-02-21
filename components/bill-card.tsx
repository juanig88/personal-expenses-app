"use client"

import { Check, Clock, AlertCircle, ChevronRight } from "lucide-react"
import type { Bill } from "@/types/bill"
import { formatLocaleDate } from "@/lib/date"

export type { Bill }

interface BillCardProps {
  bill: Bill
  onPress?: () => void
  compact?: boolean
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
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  paid: {
    icon: Check,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  overdue: {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
}

export function BillCard({ bill, onPress, compact = true }: BillCardProps) {
  const status = statusConfig[bill.status]
  const StatusIcon = status.icon

  if (compact) {
    return (
      <button
        type="button"
        onClick={onPress}
        className="group flex w-full items-center gap-3 border-b border-border/50 bg-card px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50 active:bg-muted"
      >
        {/* Status indicator */}
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${status.bg}`}
        >
          <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
        </div>

        {/* Description */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {bill.serviceName}
        </span>

        {/* Due date */}
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatLocaleDate(bill.dueDate)}
        </span>

        {/* Amount */}
        <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
          ${formatCurrency(bill.amount)}
        </span>

        {/* Chevron */}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </button>
    )
  }

  // Full card variant (for backwards compatibility)
  return (
    <button
      type="button"
      onClick={onPress}
      className="group flex w-full items-center gap-4 rounded-xl border border-border/50 bg-card p-4 text-left shadow-sm transition-all hover:border-border hover:shadow-md active:scale-[0.99]"
    >
      {/* Status indicator */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${status.bg}`}
      >
        <StatusIcon className={`h-5 w-5 ${status.color}`} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium text-foreground">
          {bill.serviceName}
        </span>
        <span className="text-xs text-muted-foreground">
          Vence {formatLocaleDate(bill.dueDate)}
        </span>
      </div>

      {/* Amount */}
      <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
        ${formatCurrency(bill.amount)}
      </span>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
