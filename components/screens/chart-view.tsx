"use client"

import { useEffect, useMemo, useState } from "react"
import { ResponsiveContainer, LineChart as ReLineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { BottomNav, type NavScreen } from "@/components/bottom-nav"
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
import { buildMonthlyEvolutionSeries } from "@/application/bills/chart"
import type { Bill } from "@/types/bill"
import { useLocale } from "@/lib/i18n/context"
import { getMonthName } from "@/lib/i18n/translations"
import { formatCurrencyCompact } from "@/lib/i18n/format"

function parseKeyToYearMonth(key: string): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number)
  return { year: y, month: m }
}

function formatYearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

function shiftKeyByMonths(key: string, deltaMonths: number): string {
  const { year, month } = parseKeyToYearMonth(key)
  const d = new Date(year, month - 1, 1)
  d.setMonth(d.getMonth() + deltaMonths)
  return formatYearMonthKey(d.getFullYear(), d.getMonth() + 1)
}

interface ChartViewProps {
  userEmail: string
  onNavigate?: (screen: NavScreen) => void
  activeNav?: NavScreen
}

export function ChartView({ userEmail, onNavigate, activeNav = "chart" }: ChartViewProps) {
  const { t, locale } = useLocale()
  const [summaries, setSummaries] = useState<MonthSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [fromKey, setFromKey] = useState<string>("")
  const [toKey, setToKey] = useState<string>("")
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

  const series = useMemo(() => buildMonthlyEvolutionSeries(summaries), [summaries])

  useEffect(() => {
    if (loading) return
    if (series.length === 0) return
    if (fromKey !== "" && toKey !== "") return
    const latest = series[series.length - 1]!.key
    const nextFrom = shiftKeyByMonths(latest, -11)
    setFromKey(nextFrom)
    setToKey(latest)
  }, [loading, series, fromKey, toKey])

  const filteredSeries = useMemo(() => {
    if (fromKey === "" || toKey === "") return series
    const start = fromKey <= toKey ? fromKey : toKey
    const end = fromKey <= toKey ? toKey : fromKey
    return series.filter((p) => p.key >= start && p.key <= end)
  }, [series, fromKey, toKey])

  const chartData = useMemo(
    () =>
      filteredSeries.map((p) => ({
        ...p,
        label: `${getMonthName(locale, p.month)} ${p.year}`,
      })),
    [filteredSeries, locale]
  )

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
              <p className="text-xs text-muted-foreground">{t("chart.title")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 pt-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
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
        ) : series.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("chart.empty")}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t("chart.incomeVsExpenses")}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-background px-3 py-2">
                <label htmlFor="from-month" className="block text-xs font-medium text-muted-foreground">
                  {t("chart.from")}
                </label>
                <input
                  id="from-month"
                  type="month"
                  value={fromKey}
                  onChange={(e) => setFromKey(e.target.value)}
                  className="mt-1 w-full bg-transparent text-sm text-foreground outline-none"
                />
              </div>
              <div className="rounded-xl border border-border bg-background px-3 py-2">
                <label htmlFor="to-month" className="block text-xs font-medium text-muted-foreground">
                  {t("chart.to")}
                </label>
                <input
                  id="to-month"
                  type="month"
                  value={toKey}
                  onChange={(e) => setToKey(e.target.value)}
                  className="mt-1 w-full bg-transparent text-sm text-foreground outline-none"
                />
              </div>
            </div>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => formatCurrencyCompact(Number(v), locale)} tick={{ fontSize: 12 }} width={56} />
                  <Tooltip
                    formatter={(value) => `$${formatCurrencyCompact(Number(value), locale)}`}
                    labelFormatter={(label) => String(label)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name={t("chart.income")}
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name={t("chart.expenses")}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>{t("chart.month")}</span>
                <span className="text-right">{t("chart.income")}</span>
                <span className="text-right">{t("chart.expenses")}</span>
              </div>
              <div className="max-h-64 overflow-auto">
                {chartData.map((p) => (
                  <div
                    key={p.key}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="tabular-nums text-right text-emerald-600 dark:text-emerald-400">
                      ${formatCurrencyCompact(p.income, locale)}
                    </span>
                    <span className="tabular-nums text-right text-amber-600 dark:text-amber-400">
                      ${formatCurrencyCompact(p.expenses, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav onNavigate={onNavigate} activeScreen={activeNav} />
    </div>
  )
}

