import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it.each<{ name: string; inputs: Parameters<typeof cn>; expected: string }>([
    { name: "single class", inputs: ["foo"], expected: "foo" },
    { name: "multiple strings", inputs: ["foo", "bar"], expected: "foo bar" },
    { name: "conditional false", inputs: ["foo", false && "bar"], expected: "foo" },
    { name: "conditional true", inputs: ["foo", true && "bar"], expected: "foo bar" },
    { name: "tailwind merge", inputs: ["p-2", "p-4"], expected: "p-4" },
    { name: "empty", inputs: [], expected: "" },
    { name: "undefined filtered", inputs: ["a", undefined, "b"], expected: "a b" },
  ])("$name", ({ inputs, expected }) => {
    expect(cn(...inputs)).toBe(expected)
  })
})
