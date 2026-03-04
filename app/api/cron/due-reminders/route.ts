import { NextResponse } from "next/server"
import webpush from "web-push"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/** Formato de monto para notificación (Argentina). */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Formato de fecha para notificación: DD/MM */
function formatDueDate(dueDate: string): string {
  const [y, m, d] = dueDate.split("-")
  return `${d}/${m}`
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) {
    console.error("[cron/due-reminders] VAPID keys not set")
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 })
  }

  webpush.setVapidDetails(
    "mailto:gastos@example.com",
    vapidPublic,
    vapidPrivate
  )

  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = new Date(Date.UTC(year, month, 0)).getDate()
  const monthEndStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  const todayStr = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  const { data: bills, error: billsError } = await supabaseAdmin
    .from("bills")
    .select("id, user_email, service, amount, due_date")
    .in("due_date", [todayStr, tomorrowStr])
    .gte("due_date", monthStart)
    .lte("due_date", monthEndStr)

  if (billsError) {
    console.error("[cron/due-reminders] bills", billsError)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }

  if (!bills?.length) {
    return NextResponse.json({ ok: true, sent: 0, message: "No bills due today or tomorrow" })
  }

  const byUser = new Map<string, { due_date: string; service: string; amount: number }[]>()
  for (const b of bills) {
    const list = byUser.get(b.user_email) ?? []
    list.push({ due_date: b.due_date, service: b.service, amount: b.amount })
    byUser.set(b.user_email, list)
  }

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("user_email, subscription")

  const byEmailSubs = new Map<string, webpush.PushSubscription[]>()
  for (const row of subs ?? []) {
    const list = byEmailSubs.get(row.user_email) ?? []
    list.push(row.subscription as webpush.PushSubscription)
    byEmailSubs.set(row.user_email, list)
  }

  let sent = 0
  const failed: string[] = []

  for (const [userEmail, userBills] of byUser) {
    const subscriptions = byEmailSubs.get(userEmail) ?? []
    if (!subscriptions.length) continue

    const todayBills = userBills.filter((b) => b.due_date === todayStr)
    const tomorrowBills = userBills.filter((b) => b.due_date === tomorrowStr)

    const toSend: { title: string; body: string }[] = []
    if (tomorrowBills.length) {
      const lines = tomorrowBills.map(
        (b) => `${b.service} $${formatAmount(b.amount)} (${formatDueDate(b.due_date)})`
      )
      toSend.push({
        title: "Vence mañana",
        body: lines.join("\n"),
      })
    }
    if (todayBills.length) {
      const lines = todayBills.map(
        (b) => `${b.service} $${formatAmount(b.amount)} (${formatDueDate(b.due_date)})`
      )
      toSend.push({
        title: "Vence hoy",
        body: lines.join("\n"),
      })
    }

    for (const sub of subscriptions) {
      for (const payload of toSend) {
        try {
          await webpush.sendNotification(
            sub,
            JSON.stringify({ title: payload.title, body: payload.body }),
            { TTL: 86400 }
          )
          sent++
        } catch (err) {
          console.error("[cron/due-reminders] push failed", err)
          failed.push(`${userEmail}: ${(err as Error).message}`)
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed: failed.length ? failed : undefined,
  })
}
