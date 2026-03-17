"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/bottom-nav"
import { UserMenu } from "@/components/user-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import {
  getAllBills,
  groupBillsByMonth,
  getMonthlySummaries,
  getMonthlyIncomesByKeys,
  type MonthSummary,
} from "@/services/billingService"
import type { Bill } from "@/types/bill"
import { useLocale } from "@/lib/i18n/context"
import { getMonthName } from "@/lib/i18n/translations"
import { formatCurrencyCompact } from "@/lib/i18n/format"

interface SummaryViewProps {
  userEmail: string
  onSelectMonth: (year: number, month: number) => void
  onNavigate?: (screen: "summary" | "detail" | "chart") => void
  activeNav?: "summary" | "detail" | "chart"
}

export function SummaryView({
  userEmail,
  onSelectMonth,
  onNavigate,
  activeNav = "summary",
}: SummaryViewProps) {
  const { t, locale } = useLocale()
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
      .then((result: { grouped: Record<string, Bill[]>; incomeByKey: Record<string, number> } | undefined) => {
        if (cancelled || result == null) return
        setSummaries(getMonthlySummaries(result.grouped, result.incomeByKey))
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
          <div className="flex items-center gap-3 pt-4">
            <Image
              src="/brand/pea.png"
              alt={t("common.appHeaderTitle")}
              width={36}
              height={36}
              className="h-9 w-9"
              priority={false}
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground">
                {t("common.appHeaderTitle")}
              </div>
              <p className="text-xs text-muted-foreground">{t("summary.title")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 pt-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">{t("common.toggleTheme")}</span>
            </Button>
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pb-28 pt-2">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : summaries.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{t("summary.empty")}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {summaries.map((s) => {
              const pendingTotal = (s.bills ?? [])
                .filter((b) => b.status === "pending" || b.status === "overdue")
                .reduce((acc, b) => acc + Number(b.amount), 0)

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onSelectMonth(s.year, s.month)}
                  className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.99]"
                >
                <h3 className="text-lg font-semibold text-foreground font-display tracking-[-0.01em]">
                  {getMonthName(locale, s.month)} {s.year}
                </h3>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("summary.expenses")}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        ${formatCurrencyCompact(s.totalExpenses, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("summary.pending")}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        ${formatCurrencyCompact(pendingTotal, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("summary.income")}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        ${formatCurrencyCompact(s.monthlyIncome, locale)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground">{t("summary.balance")}</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          s.difference >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        ${formatCurrencyCompact(Math.abs(s.difference), locale)}
                        {s.difference < 0 ? ` ${t("summary.negative")}` : ""}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav onNavigate={onNavigate} activeScreen={activeNav} />
    </div>
  )
}
