# Hive Template Importer

Git history is one initial commit of the finished app, not a day-by-day log. The work was built over about two focused days; this repo is the snapshot submitted.

Web app for inspectors leaving Spectora: upload a Spectora HTML-text spreadsheet export, review what was kept or skipped, save a structured template, then edit or duplicate it.

There is no login.

## Stack

- Frontend: React (Create React App) in `frontend/`
- Backend: Node.js + Express in `backend/`
- Database: Supabase (Postgres), accessed only from the server with the secret key

## Database

1. Create a Supabase project.
2. Open the SQL editor and run [`schema.sql`](schema.sql) on a **fresh** project (do not run it if these tables already exist).
3. Copy the project URL and secret key into the backend `.env` (see below).

Tables: `templates` → `sections` → `items` → `comments`. Deleting a template cascades to children.

## Environment variables

### Backend (`backend/.env`)

Copy `backend/.env.example` and fill in real values:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `5000`) |
| `CLIENT_ORIGIN` | Frontend origin for CORS |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server-only key used by the API |

`SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_JWKS_URL` appear in `.env.example` but are not used by the API today.

The example file currently has `CLIENT_ORIGIN=http://localhost:5173`. Create React App serves the UI on **port 3000**, so for local development set:

```
CLIENT_ORIGIN=http://localhost:3000
```

Never commit `.env` or secret keys.

### Frontend (`frontend/.env`)

```
REACT_APP_API_URL=http://localhost:5000
```

That is the backend origin only (no `/api` suffix). The client appends `/api/...` itself.

## Local setup

Requires Node.js 18+.

```bash
# Backend
cd backend
npm install
cp .env.example .env   # then edit values
npm run dev            # http://localhost:5000

# Frontend (second terminal)
cd frontend
npm install
# ensure frontend/.env has REACT_APP_API_URL=http://localhost:5000
npm start              # http://localhost:3000
```

## How to use it

1. Open the app. The home page lists saved templates (empty until you import).
2. Click **Import template** (`/import`) and upload a Spectora HTML-text spreadsheet (`.xlsx` or `.xls`).
3. Review the parsed tree. Skipped rows and unsupported columns are shown; nothing is written to the database yet.
4. Confirm, name the template, and save.
5. From the home page: inspect the tree, edit names and comment text, duplicate, or delete.

Put the Spectora export you used under `fixtures/` and note the template name and source in `NOTES.md` so reviewers can test the same file.

## API (summary)

- `POST /api/import/parse` — multipart field `file`; returns tree, `unsupportedColumns`, `skippedRows`
- `POST /api/import/confirm` — `{ templateName, tree, unsupportedColumns }`; saves to Postgres
- `GET /api/templates` — list
- `GET /api/templates/:id` — nested tree
- `PATCH /api/templates/:templateId/field` — one field at a time (`name` or `comment_text`)
- `POST /api/templates/:templateId/duplicate` — `{ name }`
- `DELETE /api/templates/:id`

## License / credits

See `NOTES.md`. Built with Express, Create React App, SheetJS (`xlsx`), and `@supabase/supabase-js`.
