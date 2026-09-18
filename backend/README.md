# Hive Backend

Production-style Node.js API for Hive. React calls these endpoints. Supabase is wired for later use; the first parse endpoint does not write to the database.

## Setup

```bash
cd backend
cp .env.example .env
npm install
```

Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` when you connect a project. They are not required for the parse endpoint.

## Run

```bash
npm run dev
```

Server listens on `http://localhost:5000` by default.

## Endpoints

### `POST /api/imports/parse`

Upload a single `.xlsx` file (multipart field name: `file`, max 5 MB). Returns row and column counts for the first sheet. The header row and empty rows are counted.

Example (`curl`):

```bash
curl -X POST http://localhost:5000/api/imports/parse \
  -F "file=@./sample.xlsx"
```

Success:

```json
{
  "success": true,
  "data": {
    "rows": 120,
    "columns": 8,
    "sheetName": "Sheet1"
  }
}
```
