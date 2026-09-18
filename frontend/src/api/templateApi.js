const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Fetch all templates (id, name, created_at, import_flags) newest-first.
 * @returns {Promise<Array<{id, name, created_at, import_flags}>>}
 */
export async function listTemplates() {
  const res = await fetch(`${API_BASE}/api/templates`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load templates');
  return json.data;
}

/**
 * Fetch one template's full nested tree (sections → items → comments).
 * @param {string} id - template UUID
 * @returns {Promise<{id, name, created_at, import_flags, sections: Array}>}
 */
export async function getTemplate(id) {
  const res = await fetch(`${API_BASE}/api/templates/${id}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load template');
  return json.data;
}

/**
 * Permanently delete a template and all its children.
 * @param {string} id - template UUID
 */
export async function deleteTemplate(id) {
  const res = await fetch(`${API_BASE}/api/templates/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || 'Delete failed');
  }
}

/**
 * Deep-copy a template with a new name.
 * @param {string} templateId - UUID of the source template
 * @param {string} name - name for the duplicate
 * @returns {Promise<{id, name, created_at, import_flags}>} the new template row
 */
export async function duplicateTemplate(templateId, name) {
  const res = await fetch(`${API_BASE}/api/templates/${templateId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Duplication failed');
  return json.data;
}

/**
 * Update a single field on any entity in the template hierarchy.
 * @param {string} templateId - parent template UUID (used in the URL)
 * @param {'template'|'section'|'item'|'comment'} entity
 * @param {string} entityId - UUID of the row being updated
 * @param {'name'|'comment_text'} field
 * @param {string} value
 */
export async function updateField(templateId, entity, entityId, field, value) {
  const res = await fetch(`${API_BASE}/api/templates/${templateId}/field`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity, entityId, field, value }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Save failed');
  return json.data; // { entity, entityId, field, value }
}
