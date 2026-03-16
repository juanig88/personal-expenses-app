"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { LoginScreen } from "../components/screens/login-screen"
import { SummaryView } from "../components/screens/summary-view"
import { MonthlyDetailView } from "../components/screens/monthly-detail-view"
import { BillDetailScreen } from "../components/screens/bill-detail-screen"
import { ChartView } from "../components/screens/chart-view"
import type { Bill } from "@/types/bill"
import type { NavScreen } from "@/components/bottom-nav"
import { useLocale } from "@/lib/i18n/context"

type Screen = "login" | "home" | "detail"

export default function Page() {
  const { t } = useLocale()
  const { data: session, status } = useSession()
  const [currentScreen, setCurrentScreen] = useState<Screen>("login")
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [view, setView] = useState<NavScreen>("detail")
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  })
  const refetchBillsRef = useRef<(() => void | Promise<void>) | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      setCurrentScreen("login")
    } else if (status === "authenticated") {
      setCurrentScreen("home")
    }
  }, [status])

  const handleSelectBill = (bill: Bill) => {
    setSelectedBill(bill)
    setCurrentScreen("detail")
  }

  const handleBackFromDetail = () => {
    setSelectedBill(null)
    setCurrentScreen("home")
  }

  const handleSelectMonth = (year: number, month: number) => {
    setSelectedMonth({ year, month })
    setView("detail")
  }

  const userEmail = session?.user?.email ?? ""

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    )
  }

  if (currentScreen === "login" || !session) {
    return <LoginScreen />
  }

  if (currentScreen === "detail" && selectedBill) {
    return (
      <BillDetailScreen
        bill={selectedBill}
        onBack={handleBackFromDetail}
        onBillUpdated={() => refetchBillsRef.current?.()}
      />
    )
  }

  const handleNav = (screen: NavScreen) => setView(screen)

  if (view === "summary") {
    return (
      <SummaryView
        userEmail={userEmail}
        onSelectMonth={handleSelectMonth}
        onNavigate={handleNav}
        activeNav="summary"
      />
    )
  }

  if (view === "chart") {
    return (
      <ChartView
        userEmail={userEmail}
        onNavigate={handleNav}
        activeNav="chart"
      />
    )
  }

  return (
    <MonthlyDetailView
      year={selectedMonth.year}
      month={selectedMonth.month}
      userEmail={userEmail}
      onSelectBill={handleSelectBill}
      onNavigate={handleNav}
      activeNav="detail"
      refetchBillsRef={refetchBillsRef}
    />
  )
}
