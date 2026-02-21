"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

export function UserMenu() {
  const { data: session } = useSession()

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
