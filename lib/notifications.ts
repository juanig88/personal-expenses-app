/**
 * Decode base64url VAPID public key to Uint8Array for PushManager.subscribe.
 * Uses ArrayBuffer so the result is a valid BufferSource for the Push API.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i)
  }
  return view
}

export type PushSubscribeResult =
  | { ok: true }
  | { ok: false; error: "unsupported" | "denied" | "network" | string }

/**
 * Register SW, request permission, subscribe to push and send to API.
 * Call from user action (e.g. "Activar notificaciones").
 */
export async function subscribeToDueReminders(
  vapidPublicKey: string
): Promise<PushSubscribeResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "unsupported" }
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    return { ok: false, error: "denied" }
  }

  let registration = await navigator.serviceWorker.getRegistration()
  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    await navigator.serviceWorker.ready
  }

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  })

  const res = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data?.error || "network" }
  }

  return { ok: true }
}

export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
}
