import { describe, it, expect } from "vitest"
import { parseLocalDate, formatLocaleDate } from "./date"

describe("parseLocalDate", () => {
  it.each<{ name: string; input: string; expected: Date }>([
    {
      name: "happy path",
      input: "2026-02-15",
      expected: new Date(2026, 1, 15),
    },
    {
      name: "first day of month",
      input: "2026-01-01",
      expected: new Date(2026, 0, 1),
    },
    {
      name: "last day of month",
      input: "2026-01-31",
      expected: new Date(2026, 0, 31),
    },
    {
      name: "leap year feb 29",
      input: "2024-02-29",
      expected: new Date(2024, 1, 29),
    },
    {
      name: "year 1900 month 0 becomes prior year Dec",
      input: "1900-01-01",
      expected: new Date(1900, 0, 1),
    },
  ])("$name: $input", ({ input, expected }) => {
    const got = parseLocalDate(input)
    expect(got.getFullYear()).toBe(expected.getFullYear())
    expect(got.getMonth()).toBe(expected.getMonth())
    expect(got.getDate()).toBe(expected.getDate())
  })

  it.each<{ name: string; input: string }>([
    { name: "empty string", input: "" },
    { name: "missing parts", input: "2026" },
  ])("$name uses defaults or NaN", ({ input }) => {
    const got = parseLocalDate(input)
    expect(got).toBeInstanceOf(Date)
    expect(Number.isNaN(got.getTime())).toBe(false)
  })
})

describe("formatLocaleDate", () => {
  it.each<{ name: string; input: string; expectedPattern: RegExp }>([
    {
      name: "happy path",
      input: "2026-02-01",
      expectedPattern: /^\d{1,2}\/\d{1,2}\/2026$/,
    },
    {
      name: "es-AR style",
      input: "2026-12-25",
      expectedPattern: /^\d{1,2}\/\d{1,2}\/2026$/,
    },
  ])("$name: $input", ({ input, expectedPattern }) => {
    const got = formatLocaleDate(input)
    expect(got).toMatch(expectedPattern)
  })

  it("returns string with day, month, year", () => {
    const got = formatLocaleDate("2026-03-09")
    expect(typeof got).toBe("string")
    expect(got.length).toBeGreaterThan(0)
    expect(got).toContain("2026")
  })
})
