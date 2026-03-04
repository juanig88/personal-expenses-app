/* Service worker for Web Push - recordatorios de vencimientos */
self.addEventListener("push", function (event) {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: "Gastos", body: event.data.text() }
  }
  const title = payload.title || "Gastos"
  const options = {
    body: payload.body || "",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag: "due-reminder",
    renotify: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", function (event) {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0 && clientList[0].focus) {
        return clientList[0].focus()
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/")
      }
    })
  )
})
