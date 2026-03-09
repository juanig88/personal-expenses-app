import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const MAX_ENDPOINT_LENGTH = 2048
const MAX_KEY_LENGTH = 512

const subscribeBodySchema = z.object({
  endpoint: z.string().url().max(MAX_ENDPOINT_LENGTH),
  keys: z.object({
    auth: z.string().min(1).max(MAX_KEY_LENGTH),
    p256dh: z.string().min(1).max(MAX_KEY_LENGTH),
  }),
})

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

    const raw = await req.json()
    const parsed = subscribeBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Falta subscription (endpoint, keys) o formato inválido" },
        { status: 400 }
      )
    }
    const { endpoint, keys } = parsed.data
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
