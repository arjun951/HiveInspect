---
name: hive-duplicate-store
description: >-
  Hive template duplicate, delete, import_flags, and schema. Use when
  changing copy behavior, cascade delete, persisting skipped rows, or
  altering schema.sql / templates.service.js.
---

# Hive duplicate and store

Schema source: `schema.sql`. Four tables, UUID PKs, `ON DELETE CASCADE`. Do not document or add indexes unless asked.

## Duplicate

`duplicateTemplate` in `backend/src/services/templates.service.js`:

1. `getTemplateById(sourceId)`
2. Insert new `templates` row (`newName`, same `import_flags`)
3. Batch-insert sections / items / comments with **new UUIDs**; remap FKs via `order_index` (and section_id+order_index for items)
4. On any insert error: delete the new template (cascade); throw
5. Original rows must be untouched

Frontend: HomePage 3-dot menu → name popup → prepend new card. Do not switch selection unless asked.

## Delete

`DELETE /api/templates/:id` deletes the template row only. Children go via FK cascade. Clear `selectedId` if it was the deleted template.

## What is persisted vs not

- `import_flags` jsonb: unsupported **column names** from parse (not cell values).
- Skipped rows exist only on the **review** screen. After confirm they are **not** saved.

If asked to persist skips: add `skipped_rows jsonb default '[]'` on `templates`, pass `skippedRows` through `POST /api/import/confirm`, show them on the home detail header. Do not put skip reasons on comments.

## Copy vs original check

After duplicate, edit a name on the copy, reload both ids — original `name` / comment ids must be unchanged.
