declare module "web-push" {
  export interface PushSubscription {
    endpoint: string
    keys: { auth: string; p256dh: string }
    expirationTime?: number | null
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void

  export function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer | null,
    options?: { TTL?: number }
  ): Promise<unknown>
}
