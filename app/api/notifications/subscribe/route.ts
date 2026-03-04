import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })
    const email = token?.email as string | undefined
    if (!email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { endpoint, keys } = body as { endpoint?: string; keys?: { auth: string; p256dh: string } }
    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return NextResponse.json(
        { error: "Falta subscription (endpoint, keys)" },
        { status: 400 }
      )
    }

    const subscription = { endpoint, keys }

    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_email: email,
        endpoint,
        subscription,
      },
      { onConflict: "endpoint" }
    )

    if (error) {
      console.error("[notifications/subscribe]", error)
      return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[notifications/subscribe]", err)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
