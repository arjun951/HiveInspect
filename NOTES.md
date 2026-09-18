# NOTES

Repo history is a single dump of the finished project (not incremental commits). Time spent is still ~2 focused days; see below.

Spectora HTML-text spreadsheet → structured templates (sections / items / comments), then edit or copy. Extra bet: parse first, save only after review — skipped and unsupported content is visible, not silently dropped.

## Shipped

- Parse → review → confirm. Hierarchy and order preserved.
- Unsupported column **names** stored as `import_flags`; their values are never stored.
- After save: edit template/section/item/comment **name** and comment **text**; duplicate; delete.
- Postgres (Supabase). Reload still has the data.

## Cut (on purpose)

- Reports, scheduling, payments, login.
- Editor: names + comment text only. Severity and other stored fields are out of scope.
- Default photos: only Default Photo 1 is stored. 2–10 are unsupported; no image gallery in the UI.
- Skipped-row list is not persisted after confirm (only `import_flags` remain).
- `/api/names` is leftover scaffolding, not product.

## Input and limits

Spectora **InterNACHI Residential**, **Export to spreadsheet → Export HTML Text** (not plain text). `.xlsx`/`.xls`. Headers must match `backend/src/utils/importValidation.js` exactly.

If Spectora renames a column, it becomes unsupported. **No LLM fallback.**

`Comment Text` is stored as HTML and rendered as HTML. Not sanitized.

- Empty optional field (e.g. severity) → `null` (missing from export).
- Unknown header → unsupported (values discarded).
- Invalid required field → row skipped on parse; confirm rejects the request if any comment fails.

Commit the export under `fixtures/` for reviewers.

## Product exploration

Tried **Hive Inspect**, **Spectora**, and **Binsr**.

Binsr shows column mapping and a spreadsheet preview, and lets you edit mapping **before** finalize. It does not ask which software you came from. Hive Inspect asks for the source software, then generates the template with no mapping step and no sheet preview.

This app reviews the **parsed tree** before save (like Binsr’s “don’t write yet”) but maps by exact Spectora headers, not inferred/LLM mapping.

Hive could show mapping + a source-sheet preview before creating the template, and not require the user to pick the origin software if the file already identifies itself.

## How checked

Import InterNACHI HTML-text and compare tree vs spreadsheet. Reload after save. Edit, reload. Duplicate and edit the copy; original unchanged. Failure: bad file or invalid comment type → 400 or skipped row, not a silent drop.

## Time and credits

~2 focused days (~16 hours): exploration, build, write-up.

Express, CRA, SheetJS (`xlsx`), `@supabase/supabase-js`. Cursor used to build; **no model in the import path**. Schema: `schema.sql`.
