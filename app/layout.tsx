import React from "react"
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Fraunces, Albert_Sans } from "next/font/google"
import { ThemeProvider } from '@/components/theme-provider'
import { NextAuthSessionProvider } from '@/components/providers/session-provider'
import { LocaleProvider } from '@/lib/i18n/context'
import { DisableContextMenu } from '@/components/disable-context-menu'
import './globals.css'

const fontSans = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: 'Gastos - Personal Expenses',
  description: 'Track your bills and expenses',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gastos',
  },
  icons: {
    icon: '/brand/pea.png',
    apple: '/brand/pea.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f1e8' },
    { media: '(prefers-color-scheme: dark)', color: '#120f0c' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontDisplay.variable} font-sans antialiased`}>
        <DisableContextMenu>
          <NextAuthSessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <LocaleProvider>
                {children}
              </LocaleProvider>
            </ThemeProvider>
          </NextAuthSessionProvider>
          <Analytics />
        </DisableContextMenu>
      </body>
    </html>
  )
}
