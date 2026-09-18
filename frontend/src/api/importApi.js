const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Upload an .xlsx file to the parse endpoint.
 * Returns { tree, unsupportedColumns, skippedRows } on success.
 * Throws an Error with a human-readable message on failure.
 */
export async function parseFile(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/api/import/parse`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Parse failed');
  return json.data; // { tree, unsupportedColumns, skippedRows }
}

/**
 * Save the reviewed+edited tree to the database.
 * Returns { templateId } on success.
 * Throws the raw json object on failure so the caller can read json.invalidComments.
 */
export async function confirmImport(templateName, tree, unsupportedColumns) {
  const res = await fetch(`${API_BASE}/api/import/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateName, tree, unsupportedColumns }),
  });

  const json = await res.json();
  if (!res.ok) throw json; // caller reads json.message and json.invalidComments
  return json.data; // { templateId }
}
