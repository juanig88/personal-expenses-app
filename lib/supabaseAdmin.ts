import { createClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase client (API routes, server components).
 * Uses SERVICE_ROLE_KEY — bypasses RLS. Never use in frontend.
 */
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase admin env: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel (Production) and .env.local"
  )
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
