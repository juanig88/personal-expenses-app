---
name: unit-tests-with-code
description: When creating new code, always generate unit tests covering happy path and edge cases; prefer table-driven tests. Use when writing new functions, modules, API handlers, or features.
---

# Unit Tests With New Code

When you create or significantly change code, **always generate unit tests** in the same change. Do not leave new code untested.

## Requirements

1. **Always generate tests** for new or modified behavior (functions, modules, handlers, utilities).
2. **Cover both**:
   - **Happy path**: nominal inputs and expected outputs.
   - **Edge cases**: empty input, nil/null, zero, negative numbers, max length, invalid types, duplicate ids, not-found, permission denied, etc., as relevant.
3. **Prefer table-driven tests** (one test entry point, many input/expected rows) so adding cases is easy and structure stays clear.

## Table-driven style

Define a list of cases (name, input, expected) and iterate. Keeps tests readable and makes edge cases explicit.

**Go:**
```go
func TestParseAmount(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    float64
		wantErr bool
	}{
		{"happy path", "42.50", 42.50, false},
		{"empty", "", 0, true},
		{"invalid", "abc", 0, true},
		{"negative", "-10", -10, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseAmount(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseAmount() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("ParseAmount() = %v, want %v", got, tt.want)
			}
		})
	}
}
```

**JavaScript/TypeScript (Jest):**
```ts
describe("parseAmount", () => {
  it.each<{ input: string; expected: number; throws?: boolean }>([
    { input: "42.50", expected: 42.5 },
    { input: "", expected: 0, throws: true },
    { input: "abc", expected: 0, throws: true },
    { input: "-10", expected: -10 },
  ])("$input -> $expected (throws: $throws)", ({ input, expected, throws }) => {
    if (throws) {
      expect(() => parseAmount(input)).toThrow();
      return;
    }
    expect(parseAmount(input)).toBe(expected);
  });
});
```

**Other languages:** Use the same idea: a list/array of `{ name, input, expected }` and one loop or parameterized test that runs the function and asserts.

## Checklist before finishing

- [ ] Unit tests added or updated for the new/changed code.
- [ ] At least one happy-path and one edge-case (or more) covered.
- [ ] Table-driven or parameterized form used where it fits; otherwise separate `it()`/`Test` cases with clear names.
