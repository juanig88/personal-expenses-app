import { describe, it, expect, afterEach } from "vitest"
import {
  urlBase64ToUint8Array,
  isNotificationSupported,
} from "./notifications"

describe("urlBase64ToUint8Array", () => {
  it.each<{ name: string; input: string; expectedLength?: number; expectedFirst?: number }>([
    {
      name: "happy path base64url",
      input: "AQIDBAU",
      expectedLength: 5,
      expectedFirst: 1,
    },
    {
      name: "with padding",
      input: "YWI",
      expectedLength: 2,
      expectedFirst: 97,
    },
    {
      name: "empty string",
      input: "",
      expectedLength: 0,
    },
    {
      name: "single byte",
      input: "AA",
      expectedLength: 1,
      expectedFirst: 0,
    },
  ])("$name", ({ input, expectedLength, expectedFirst }) => {
    const got = urlBase64ToUint8Array(input)
    expect(got).toBeInstanceOf(Uint8Array)
    expect(got.length).toBe(expectedLength ?? got.length)
    if (expectedFirst !== undefined && got.length > 0) {
      expect(got[0]).toBe(expectedFirst)
    }
  })
})

describe("isNotificationSupported", () => {
  const g = globalThis as typeof globalThis & { window?: unknown }

  afterEach(() => {
    delete g.window
  })

  it("returns false when window is undefined (e.g. Node)", () => {
    expect(isNotificationSupported()).toBe(false)
  })

  it("returns false when Notification is missing", () => {
    g.window = {
      Notification: undefined,
      navigator: { serviceWorker: {} },
      PushManager: {},
    }
    expect(isNotificationSupported()).toBe(false)
  })

  it("returns false when PushManager is missing", () => {
    g.window = {
      Notification: {},
      navigator: { serviceWorker: {} },
      PushManager: undefined,
    }
    expect(isNotificationSupported()).toBe(false)
  })

  it("returns false when serviceWorker is missing", () => {
    g.window = {
      Notification: {},
      navigator: {},
      PushManager: {},
    }
    expect(isNotificationSupported()).toBe(false)
  })
})
