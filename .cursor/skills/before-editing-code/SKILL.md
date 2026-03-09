---
name: before-editing-code
description: Before editing code, analyze existing architecture, avoid rewriting working logic, make minimal changes, and explain reasoning. Use when modifying existing code, refactoring, or implementing changes in an established codebase.
---

# Before Editing Code

When you are about to change existing code, follow these steps. Do not jump straight to edits.

## 1. Analyze existing architecture

- Identify how the relevant area is structured: layers, modules, entry points, and data flow.
- Locate where the change belongs (domain, application, or infrastructure) and how it connects to the rest.
- Note existing patterns, naming, and conventions so edits stay consistent.

## 2. Avoid rewriting working logic

- Do not replace code that already works correctly unless the user explicitly asks for a rewrite.
- Reuse existing functions, types, and utilities instead of reimplementing.
- Prefer wrapping or extending over replacing. If you must change behavior, change only what is necessary.

## 3. Make minimal changes

- Edit the smallest set of files and lines needed to achieve the goal.
- Add new code rather than restructuring large blocks when possible.
- Leave unrelated code and style as-is unless it directly conflicts with the change.

## 4. Explain reasoning

- Before or with the edit, briefly state: what you analyzed, what you kept, what you changed, and why.
- If you considered a larger refactor and chose a minimal change, say so. This helps the user understand and review.

## Checklist before applying edits

- [ ] Analyzed the area (structure, layers, patterns).
- [ ] Preserved working logic; no unnecessary rewrites.
- [ ] Changes are minimal and scoped to the goal.
- [ ] Reasoning is explained (what/why).
