"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Bell } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { subscribeToDueReminders, isNotificationSupported } from "@/lib/notifications"
import { toast } from "sonner"

export function UserMenu() {
  const { data: session } = useSession()
  const [subscribing, setSubscribing] = useState(false)

  const handleEnableNotifications = async () => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapid) {
      toast.error("Notificaciones no configuradas en este entorno.")
      return
    }
    setSubscribing(true)
    try {
      const result = await subscribeToDueReminders(vapid)
      if (result.ok) {
        toast.success("Listo. Recibirás recordatorios el día anterior y el día del vencimiento.")
      } else {
        if (result.error === "denied") {
          toast.error("Permiso de notificaciones denegado.")
        } else if (result.error === "unsupported") {
          toast.error("Tu navegador no soporta notificaciones push.")
        } else {
          toast.error("No se pudo activar. Reintentá más tarde.")
        }
      }
    } finally {
      setSubscribing(false)
    }
  }

  const showNotificationsItem = isNotificationSupported()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          title={session?.user?.name || "Usuario"}
        >
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="h-10 w-10 rounded-full"
              title={session.user.name || "Usuario"}
            />
          ) : (
            <User className="h-5 w-5" />
          )}
          <span className="sr-only">Menú de usuario</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card shadow-xl">
        {session?.user?.name && (
          <div className="px-2 py-1.5 text-sm font-medium text-foreground">
            {session.user.name}
          </div>
        )}
        {session?.user?.email && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {session.user.email}
          </div>
        )}
        {showNotificationsItem && (
          <DropdownMenuItem
            onClick={handleEnableNotifications}
            disabled={subscribing}
            className="cursor-pointer"
          >
            <Bell className="mr-2 h-4 w-4" />
            {subscribing ? "Activando…" : "Recordatorios de vencimientos"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
