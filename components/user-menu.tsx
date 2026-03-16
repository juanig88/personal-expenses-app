"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Bell, Download } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { subscribeToDueReminders, isNotificationSupported } from "@/lib/notifications"
import { toast } from "sonner"
import { useLocale } from "@/lib/i18n/context"
import { getAllBills, groupBillsByMonth, getMonthlySummaries, getMonthlyIncomesByKeys } from "@/services/billingService"
import { buildExportCsv, downloadCsv } from "@/lib/export-csv"

export function UserMenu() {
  const { t } = useLocale()
  const { data: session } = useSession()
  const [subscribing, setSubscribing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleEnableNotifications = async () => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapid) {
      toast.error(t("userMenu.notificationsNotConfigured"))
      return
    }
    setSubscribing(true)
    try {
      const result = await subscribeToDueReminders(vapid)
      if (result.ok) {
        toast.success(t("userMenu.notificationsEnabled"))
      } else {
        if (result.error === "denied") {
          toast.error(t("userMenu.notificationsDenied"))
        } else if (result.error === "unsupported") {
          toast.error(t("userMenu.notificationsUnsupported"))
        } else {
          toast.error(t("userMenu.notificationsError"))
        }
      }
    } finally {
      setSubscribing(false)
    }
  }

  const showNotificationsItem = isNotificationSupported()

  const handleExportCsv = async () => {
    const email = session?.user?.email
    if (!email) return
    setExporting(true)
    toast.info(t("userMenu.exportCsvExporting"))
    try {
      const bills = await getAllBills(email)
      const grouped = groupBillsByMonth(bills)
      const keys = Object.keys(grouped)
      const incomeByKey =
        keys.length > 0
          ? await getMonthlyIncomesByKeys(email, keys)
          : ({} as Record<string, number>)
      const summaries = getMonthlySummaries(grouped, incomeByKey)
      if (summaries.length === 0) {
        toast.warning(t("userMenu.exportCsvEmpty"))
        return
      }
      const csv = buildExportCsv(
        summaries,
        {
          month: t("export.month"),
          type: t("export.type"),
          description: t("export.description"),
          amount: t("export.amount"),
        },
        t("export.typeIncome"),
        t("export.typeExpense"),
        t("export.incomeLabel")
      )
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(csv, `gastos-${date}.csv`)
      toast.success(t("userMenu.exportCsvSuccess"))
    } catch (err) {
      console.error(err)
      toast.error(t("userMenu.exportCsvError"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          title={session?.user?.name || t("common.user")}
        >
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || t("common.user")}
              className="h-10 w-10 rounded-full"
              title={session.user.name || t("common.user")}
            />
          ) : (
            <User className="h-5 w-5" />
          )}
          <span className="sr-only">{t("common.userMenu")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card shadow-xl">
        {session?.user?.name && (
          <div className="px-2 py-1.5 text-sm font-medium text-foreground">
            {session.user.name}
          </div>
        )}
        {session?.user?.email && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {session.user.email}
          </div>
        )}
        {showNotificationsItem && (
          <DropdownMenuItem
            onClick={handleEnableNotifications}
            disabled={subscribing}
            className="cursor-pointer"
          >
            <Bell className="mr-2 h-4 w-4" />
            {subscribing ? t("userMenu.enabling") : t("userMenu.dueReminders")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleExportCsv}
          disabled={exporting}
          className="cursor-pointer"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? t("userMenu.exportCsvExporting") : t("userMenu.exportCsv")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("userMenu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
