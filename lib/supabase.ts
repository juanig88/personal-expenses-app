import { createClient } from "@supabase/supabase-js"

/** Frontend Supabase client (anon key). Respeta RLS; activar políticas en las tablas. */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (Production) and .env.local"
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
