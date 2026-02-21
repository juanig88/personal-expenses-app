"use client"

import { Button } from "@/components/ui/button"
import {
  Receipt,
  Plus,
  Mail,
  MailX,
  RefreshCw,
  Inbox,
  ShieldX,
} from "lucide-react"

type StateType = "loading" | "empty" | "error"

interface StateProps {
  type: StateType
  onAction?: () => void
  onRetry?: () => void
}

// Loading state component
function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      {/* Animated icon container */}
      <div className="relative mb-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-muted">
          <Mail className="h-12 w-12 text-muted-foreground" />
        </div>
        {/* Scanning animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-24 animate-ping rounded-3xl bg-accent/20" style={{ animationDuration: "2s" }} />
        </div>
        {/* Orbiting dot */}
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent shadow-sm">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent-foreground" />
        </div>
      </div>

      <h2 className="mb-2 text-center text-xl font-semibold text-foreground">
        Revisando tu correo
      </h2>
      <p className="mb-4 max-w-[280px] text-center text-muted-foreground">
        Buscamos facturas de servicios en tus emails
      </p>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
      </div>

      <p className="mt-6 text-xs text-muted-foreground/70">
        Puede tardar unos segundos
      </p>
    </div>
  )
}

// Empty state component
function EmptyStateContent({ onAction }: { onAction?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      {/* Icon with decoration */}
      <div className="relative mb-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-muted">
          <Inbox className="h-12 w-12 text-muted-foreground" />
        </div>
        {/* Empty indicator */}
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md ring-1 ring-border">
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <h2 className="mb-2 text-center text-xl font-semibold text-foreground">
        Sin gastos por ahora
      </h2>
      <p className="mb-2 max-w-[280px] text-center text-muted-foreground">
        No encontramos facturas en tu correo
      </p>
      <p className="mb-8 max-w-[260px] text-center text-sm text-muted-foreground/70">
        Podés agregar un gasto manualmente o esperar a que llegue una factura
      </p>

      <div className="flex flex-col gap-3">
        <Button
          onClick={onAction}
          className="h-12 gap-2 rounded-xl px-6 font-medium shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          Agregar gasto
        </Button>
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-xl text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Buscar de nuevo
        </Button>
      </div>
    </div>
  )
}

// Error state component
function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      {/* Error icon */}
      <div className="relative mb-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-destructive/10">
          <MailX className="h-12 w-12 text-destructive" />
        </div>
        {/* Warning badge */}
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-destructive shadow-md">
          <ShieldX className="h-4 w-4 text-destructive-foreground" />
        </div>
      </div>

      <h2 className="mb-2 text-center text-xl font-semibold text-foreground">
        No pudimos leer tu correo
      </h2>
      <p className="mb-2 max-w-[280px] text-center text-muted-foreground">
        Necesitamos permiso para acceder a tus emails
      </p>

      {/* Error details card */}
      <div className="mb-8 mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
        <p className="text-center text-sm text-destructive">
          Permiso denegado
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Falta acceso de lectura a Gmail
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={onRetry}
          className="h-12 gap-2 rounded-xl px-6 font-medium shadow-sm transition-all active:scale-[0.98]"
        >
          <RefreshCw className="h-5 w-5" />
          Volver a dar permisos
        </Button>
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-xl text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
          Agregar gastos a mano
        </Button>
      </div>

      <p className="mt-6 max-w-[240px] text-center text-xs text-muted-foreground/70">
        Solo leemos emails de servicios. Tu privacidad está protegida.
      </p>
    </div>
  )
}

// Main exported component
export function AppState({ type, onAction, onRetry }: StateProps) {
  switch (type) {
    case "loading":
      return <LoadingState />
    case "empty":
      return <EmptyStateContent onAction={onAction} />
    case "error":
      return <ErrorState onRetry={onRetry} />
    default:
      return null
  }
}

// Keep backwards compatibility
export function EmptyState({ onAddBill }: { onAddBill?: () => void }) {
  return <EmptyStateContent onAction={onAddBill} />
}
