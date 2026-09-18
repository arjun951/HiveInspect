---
name: hive-architecture
description: >-
  Hive template importer layout, stack, routes, APIs, and data model.
  Use when changing Hive code, asking where a feature lives, or adding
  endpoints/pages. React CRA frontend, Express API, Supabase Postgres.
---

# Hive architecture

## Stack

- `frontend/` — Create React App, react-router-dom
- `backend/` — Express ESM, multer memory upload, SheetJS (`xlsx`), `@supabase/supabase-js` with **secret key only on the server**
- Database — `schema.sql` (templates → sections → items → comments, ON DELETE CASCADE)

## UI routes

- `/` — `frontend/src/pages/HomePage/HomePage.jsx` list + detail, inline edit, duplicate, delete
- `/import` — `ImportFlowPage` → Upload then Review (parse, no DB write, then confirm)

## APIs (`backend/src/routes/`)

- `POST /api/import/parse` — multipart `file`; returns `{ tree, unsupportedColumns, skippedRows }`
- `POST /api/import/confirm` — `{ templateName, tree, unsupportedColumns }`; writes DB
- `GET /api/templates` — list
- `GET /api/templates/:id` — nested tree
- `PATCH /api/templates/:templateId/field` — one field
- `POST /api/templates/:templateId/duplicate` — `{ name }`
- `DELETE /api/templates/:id`

Do **not** add `/api/names` back. That scaffolding was removed.

## Rules

- Parse never writes to Supabase. Confirm does.
- HTML is allowed only inside `comments.comment_text`, not as one blob for the whole template.
- Env: `CLIENT_ORIGIN` for CORS (CRA is port **3000**, not 5173), `REACT_APP_API_URL` is the backend origin without `/api`.
- Related skills: `hive-import-invariants`, `hive-edit-field`, `hive-duplicate-store`.
