"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { translations, type Locale } from "./translations"

const STORAGE_KEY = "gastos-locale"

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "es"
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored === "es" || stored === "en") return stored
  return "es"
}

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : undefined
}

type TFunction = (key: string, params?: Record<string, string>) => string

function createT(locale: Locale): TFunction {
  const dict = translations[locale] as Record<string, unknown>
  return (key: string, params?: Record<string, string>) => {
    let value = getNested(dict, key)
    if (value === undefined) value = getNested(translations.es as Record<string, unknown>, key) ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), v)
      }
    }
    return value
  }
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TFunction
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLocaleState(getStoredLocale())
    setMounted(true)
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  const t = createT(locale)

  const value: LocaleContextValue = {
    locale,
    setLocale,
    t,
  }

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return ctx
}
