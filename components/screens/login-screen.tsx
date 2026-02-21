"use client"

import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { signIn } from "next-auth/react"

export function LoginScreen() {
  const handleLogin = () => {
    signIn("google", { callbackUrl: "/" })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Status bar spacer for native app feel */}
      <div className="h-safe-top" />
      
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        {/* Logo and branding */}
        <div className="mb-12 flex flex-col items-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary">
            <Wallet className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Gastos
          </h1>
          <p className="mt-2 text-center text-muted-foreground">
            Organizá tus gastos del mes
          </p>
        </div>

        {/* Login section */}
        <div className="w-full max-w-sm space-y-4">
          <Button
            onClick={handleLogin}
            variant="outline"
            className="h-14 w-full gap-3 rounded-2xl border-border bg-card text-base font-medium shadow-sm transition-all active:scale-[0.98]"
          >
            <GoogleIcon className="h-5 w-5" />
            Continuar con Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Al continuar, aceptás los{" "}
            <span className="underline">Términos de uso</span> y la{" "}
            <span className="underline">Política de privacidad</span>
          </p>
        </div>
      </div>

      {/* Bottom safe area */}
      <div className="h-safe-bottom" />
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
