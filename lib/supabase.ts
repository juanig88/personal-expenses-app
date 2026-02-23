import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/** Frontend Supabase client (anon key). Respeta RLS; activar políticas en las tablas. */
let _client: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (Production) and .env.local"
    )
  }
  _client = createClient(url, key)
  return _client
}

/** Lazy client so build doesn't throw when env is not yet available (e.g. during next build). */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string, unknown>)[prop as string]
  },
})
