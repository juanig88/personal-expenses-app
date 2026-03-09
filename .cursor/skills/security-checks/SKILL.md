---
name: security-checks
description: Check code for injection vulnerabilities, secrets in code, unsafe deserialization, and missing input validation. Use when writing or reviewing code, adding APIs, handling user input, or integrating external data.
---

# Security Checks

When writing or reviewing code, always check for these issues. Apply the checks to new code and to code you are modifying.

## 1. Injection vulnerabilities

- **SQL:** Use parameterized queries or prepared statements; never concatenate or interpolate user input into SQL.
- **NoSQL:** Avoid building queries from raw user input; use safe APIs and parameterization.
- **Command / shell:** Do not pass user input to `exec`, `eval`, shell commands, or similar without strict validation and escaping.
- **Template / XSS:** Escape output in HTML, JS, or templates; use context-safe encoding (e.g. CSP, sanitization for rich content).

## 2. Secrets in code

- No API keys, passwords, tokens, or private keys in source code or config committed to the repo.
- Use environment variables, secret managers, or secure config; reference via env (e.g. `process.env`, `.env` not committed).
- Do not log secrets or include them in error messages or client responses.

## 3. Unsafe deserialization

- Do not deserialize untrusted or unvalidated data with formats that can execute code (e.g. arbitrary `pickle`, `yaml.load()` with untrusted input, `eval()` on payloads).
- Prefer safe parsers and schemas (e.g. JSON with validated shape); reject or sanitize before deserializing when the source is not trusted.

## 4. Missing input validation

- Validate and sanitize all external input: query params, body, headers, file uploads, env-based config.
- Enforce types, length limits, and allowed values; reject invalid input early.
- Validate again at trust boundaries (e.g. API entry, after reading from DB or external service if that data can be influenced by users).

## Checklist

- [ ] No injection: queries and commands use parameterization/safe APIs; output is escaped.
- [ ] No secrets in code or committed config; use env/secrets.
- [ ] Deserialization is safe (no code-executing formats on untrusted input).
- [ ] Input is validated at boundaries; invalid input is rejected.
