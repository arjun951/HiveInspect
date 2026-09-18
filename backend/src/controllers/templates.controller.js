import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listTemplates as listTemplatesService,
  getTemplateById as getTemplateByIdService,
  updateTemplateField as updateTemplateFieldService,
  duplicateTemplate as duplicateTemplateService,
  deleteTemplate as deleteTemplateService,
} from '../services/templates.service.js';

const ALLOWED_ENTITIES = ['template', 'section', 'item', 'comment'];
const ALLOWED_FIELDS = {
  template: ['name'],
  section:  ['name'],
  item:     ['name'],
  comment:  ['name', 'comment_text'],
};

/**
 * GET /api/templates
 * Returns all templates (id, name, created_at, import_flags) newest first.
 */
export const listTemplates = asyncHandler(async (req, res) => {
  const data = await listTemplatesService();
  res.json({ data });
});

/**
 * GET /api/templates/:id
 * Returns a single template with its full nested tree
 * (sections → items → comments).
 */
export const getTemplate = asyncHandler(async (req, res) => {
  const data = await getTemplateByIdService(req.params.id);
  res.json({ data });
});

/**
 * POST /api/templates/:templateId/duplicate
 * Deep-copies a template with all its sections, items, and comments.
 * Body: { name: string }
 */
export const duplicateTemplate = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!String(name ?? '').trim()) {
    return res.status(400).json({ message: 'Template name cannot be empty' });
  }
  const data = await duplicateTemplateService(req.params.templateId, name.trim());
  res.json({ data });
});

/**
 * DELETE /api/templates/:id
 * Permanently removes a template and all its children (cascade).
 */
export const deleteTemplate = asyncHandler(async (req, res) => {
  await deleteTemplateService(req.params.id);
  res.status(204).send();
});

/**
 * PATCH /api/templates/:templateId/field
 * Updates a single field on any entity in the template hierarchy.
 * Body: { entity, entityId, field, value }
 */
export const patchField = asyncHandler(async (req, res) => {
  const { entity, entityId, field, value } = req.body;

  if (!ALLOWED_ENTITIES.includes(entity)) {
    return res.status(400).json({ message: `Invalid entity: "${entity}"` });
  }
  if (!ALLOWED_FIELDS[entity].includes(field)) {
    return res.status(400).json({
      message: `Field "${field}" is not allowed on entity "${entity}"`,
    });
  }
  if (!entityId) {
    return res.status(400).json({ message: 'entityId is required' });
  }
  // Name fields cannot be empty
  if (field === 'name' && !String(value ?? '').trim()) {
    return res.status(400).json({ message: `${entity} name cannot be empty` });
  }

  const trimmed = field === 'name' ? String(value).trim() : (value ?? '');
  await updateTemplateFieldService(entity, entityId, field, trimmed);
  res.json({ data: { entity, entityId, field, value: trimmed } });
});
