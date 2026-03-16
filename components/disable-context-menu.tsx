"use client"

import type { ReactNode } from "react"

/**
 * Desactiva el menú contextual de desarrollo (Route, Turbopack, Preferences)
 * en toda la app al hacer clic derecho.
 */
export function DisableContextMenu({ children }: { children: ReactNode }) {
  return (
    <div className="contents" onContextMenu={(e) => e.preventDefault()}>
      {children}
    </div>
  )
}
