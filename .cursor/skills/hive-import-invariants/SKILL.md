---
name: hive-import-invariants
description: >-
  Hive Spectora import validation: known columns, unsupported headers,
  skipped rows, severity 0, parse vs confirm. Use when changing parse,
  confirm, importValidation.js, or spreadsheet column mapping.
---

# Hive import invariants

Single source of truth: `backend/src/utils/importValidation.js` (`KNOWN_COLUMNS`, `validateComment`). Parse loop and confirm both use it. `backend/src/controllers/import.controller.js` builds the tree.

## Unsupported columns (headers)

- Any spreadsheet header **not** in `KNOWN_COLUMNS` (exact string, case/space sensitive).
- Recorded **once per unique header**, not per row.
- **Names** go to the client and on confirm to `templates.import_flags`.
- **Cell values are never stored.** Default Photo 2–10 are unsupported by design; Default Photo 1 is known.

## Skipped rows (data)

First failure only, then `continue`. `rowNumber` is Excel-style (`i + 2`).

1. Empty Section Name / Item Name / Comment Name (trim)
2. `validateComment`: comment_type must be `info|limit|defect`; answer_type must be `boolean|checkbox|date|number|range|text`; severity if present must be -1, 0, or 1; order must parse as integer

Empty **optional** severity → `null` (missing from export), not a skip, not unsupported.

## Never

- Do not use truthiness on severity or order (`0` is valid Med / valid order).
- Do not guess (`"boolean "` is invalid). Trim only.
- Do not write to DB in parse.
- Do not invent sections with an LLM.

## Confirm

Re-run `validateComment`. If any fail → `400` `{ invalidComments: [{ tempId, reason }] }`, no insert. Insert order: template → sections → items → comments. On failure delete the new template (cascade). Correlate returned rows by `order_index`, not array position.

Limitation: only the first sheet is read; extra sheets are ignored with no flag. `parseNumericOrNull` / `parseBool` on stored-unused fields can coerce junk to null/false without skipping the row.
