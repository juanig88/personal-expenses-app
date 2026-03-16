"use client"

import { PieChart, CalendarDays, LineChart } from "lucide-react"
import { useLocale } from "@/lib/i18n/context"

export type NavScreen = "summary" | "detail" | "chart"

interface BottomNavProps {
  onNavigate?: (screen: NavScreen) => void
  activeScreen?: NavScreen
}

export function BottomNav({ onNavigate, activeScreen = "detail" }: BottomNavProps) {
  const { t } = useLocale()
  const isSummary = activeScreen === "summary"
  const isDetail = activeScreen === "detail"
  const isChart = activeScreen === "chart"

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center justify-center gap-1 pb-safe-bottom">
        <button
          type="button"
          onClick={() => onNavigate?.("summary")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 transition-colors ${
            isSummary ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PieChart className={`h-5 w-5 ${isSummary ? "stroke-[2.5]" : ""}`} />
          <span className={`text-sm ${isSummary ? "font-medium" : ""}`}>{t("nav.summary")}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.("detail")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 transition-colors ${
            isDetail ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className={`h-5 w-5 ${isDetail ? "stroke-[2.5]" : ""}`} />
          <span className={`text-sm ${isDetail ? "font-medium" : ""}`}>{t("nav.detail")}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.("chart")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 transition-colors ${
            isChart ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LineChart className={`h-5 w-5 ${isChart ? "stroke-[2.5]" : ""}`} />
          <span className={`text-sm ${isChart ? "font-medium" : ""}`}>{t("nav.chart")}</span>
        </button>
      </div>
    </nav>
  )
}
