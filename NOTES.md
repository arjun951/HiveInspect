# Project Notes

This project was built over approximately two focused days (~16 hours), covering product exploration, implementation, and write-up.

## What was built

A two-phase template importer: upload a Spectora HTML-text spreadsheet, review what was parsed and what was skipped, then confirm to save. Nothing is written to the database until the user explicitly confirms.

- **Import.** Sections, items, and comments are extracted in file order. Unsupported column names are surfaced to the user and stored on the template as `import_flags`; their values are never written. Invalid or structurally incomplete rows are skipped with a visible reason.
- **Edit.** After import, template name, section names, item names, comment names, and comment text are inline-editable and saved via a single PATCH endpoint.
- **Copy.** Any template can be duplicated under a new name. Edits to the copy do not affect the original.
- **Store.** All data persists in Supabase (Postgres). Templates survive closing and reopening the app.

## Scope decisions

The following were deliberately excluded:

- Reports, scheduling, payments, and homeowner-facing features (out of scope per the brief).
- Authentication. The app is single-user and requires no login.
- Rich field editor. Severity, answer type, recommendations, and other stored fields are not currently editable in the UI. They are imported and stored correctly; extending the editor to cover them was deprioritised.
- Default Photo 2–10 are unsupported by design. Only Default Photo 1 is in the schema.
- Skipped-row detail is not persisted after confirm. Only unsupported column names remain (via `import_flags`).

## Supported input and known limits

**Source:** Spectora, **Export to spreadsheet → Export HTML Text** (not the plain-text export). The committed file is `InterNACHI Residential`, exported September 2026.

**Format:** `.xlsx` or `.xls`, single sheet. Column headers must match the known set in `backend/src/utils/importValidation.js` exactly (case- and whitespace-sensitive). If Spectora renames a header, it becomes an unsupported column; there is no LLM fallback.

**HTML in comments.** `Comment Text` is stored as HTML (the Spectora export embeds `<p>` tags and entities). The UI renders it via `dangerouslySetInnerHTML`. There is no sanitization — this is a known limitation.

**Missing vs unsupported:**
- A known column absent from the file: field stored as `null`. Not flagged.
- An unknown header present in the file: name recorded in `import_flags`, values discarded.
- An invalid required field (bad comment type, answer type, severity, or order): that row is skipped at parse time. Confirm re-validates and rejects the whole request if any comment fails.

## How preservation was verified

- Imported InterNACHI HTML-text and compared the section / item / comment tree against the spreadsheet directly.
- Reloaded the app after confirm to verify data came from Postgres, not in-memory state.
- Edited a comment name and section name, saved, then reloaded to confirm the change persisted.
- Duplicated a template, edited the copy, and confirmed the original was unchanged.
- Failure cases: uploading a non-Excel file and uploading a file with rows containing an invalid comment type both produce clear errors rather than silent drops.

## Product exploration

Tried **Hive Inspect**, **Spectora** (primary source), and **Binsr**.

Binsr shows a column-mapping step with a spreadsheet preview before finalizing the template, and does not ask which software the file came from. Hive Inspect asks for the source software upfront and then generates the template directly, with no mapping review and no preview of the source data.

This app takes the "review before save" approach (closer to Binsr), but uses exact header matching rather than inferred or model-based mapping. The tradeoff is that it is fragile to header renames and has no fallback.

One specific improvement Hive could make: show the user a column-mapping screen before creating the template, and infer the source software from the file rather than asking for it.

## Credits

Built with Express, Create React App, SheetJS (`xlsx`), and `@supabase/supabase-js`. Cursor was used as the coding assistant throughout. No model is used in the import path — all mapping and validation is rule-based.

Database schema: `schema.sql`.

### Extra Note

The repository is a single snapshot commit rather than incremental history. I forgot to push it.
