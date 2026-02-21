import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { supabase } from "@/lib/supabase"

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID is not set")
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET is not set")
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not set")
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    },

    async signIn({ user, account }) {
      if (!user.email) return true

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .maybeSingle()

      if (error) {
        console.error("[NextAuth signIn] Error fetching user from Supabase:", error)
      }

      if (!data) {
        const { error: insertError } = await supabase.from("users").insert({
          email: user.email,
          name: user.name ?? null,
        })
        if (insertError) {
          console.error(
            "[NextAuth signIn] Failed to save user to Supabase:",
            insertError,
          )
        }
      }

      if (account?.access_token && account?.refresh_token && user.email) {
        const { error: gmailError } = await supabase.from("gmail_accounts").upsert({
          user_email: user.email,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expiry_date: account.expires_at ? account.expires_at * 1000 : null,
        })

        if (gmailError) {
          console.error(
            "[NextAuth signIn] Failed to upsert Gmail account in Supabase:",
            gmailError,
          )
        }
      }

      return true
    },
  },
})

export { handler as GET, handler as POST }
