"use client"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/i18n/context"
import { Languages } from "lucide-react"

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  const toggle = () => {
    setLocale(locale === "es" ? "en" : "es")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full"
      onClick={toggle}
      title={locale === "es" ? "English" : "Español"}
      aria-label={locale === "es" ? "Switch to English" : "Cambiar a español"}
    >
      <Languages className="h-5 w-5" />
      <span className="sr-only">
        {locale === "es" ? "English" : "Español"}
      </span>
    </Button>
  )
}
