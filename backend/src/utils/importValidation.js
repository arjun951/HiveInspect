/**
 * importValidation.js
 *
 * Single source of truth for all import validation and coercion logic.
 * Both the parse endpoint (parse loop) and the confirm endpoint
 * (defensive re-validation) import from here.
 *
 * If validation logic ever needs to change, it changes in ONE place only.
 */

export const KNOWN_COLUMNS = new Set([
  'Section Name',
  'Item Name',
  'Comment Name',
  'Comment Text',
  'Comment Type (info, limit, defect)',
  'Category (-1: Low, 0: Med, 1: High)',
  'Multiple Choice Options (comma-separated)',
  'Unit Type Options (numeric answers only, comma-separated)',
  'Order (w/i item)',
  'Answer Type (boolean, checkbox, date, number, range, text)',
  'Recommendation (from list)',
  'Default Value',
  'Default Value 2 (for "range" types)',
  'Default Unit Type (for "number" and "range" types)',
  'Default Location',
  'Default Estimate Min',
  'Default Estimate Max',
  'Locked',
  'Simple Format',
  'Disable Photos',
  'Uses',
  'Default Photo 1',
  'Default Photo 1 Caption',
  'Last Modified',
]);

const VALID_COMMENT_TYPES = new Set(['info', 'limit', 'defect']);
const VALID_ANSWER_TYPES = new Set([
  'boolean',
  'checkbox',
  'date',
  'number',
  'range',
  'text',
]);
const VALID_SEVERITIES = new Set([-1, 0, 1]);

/**
 * Validate the severity field.
 *
 * IMPORTANT: do NOT use bare truthiness (`if (!severityRaw)`) here.
 * severity = 0 ("Med") is falsy in JavaScript and is an extremely common
 * real value — a truthy check would silently convert every severity-0
 * comment to null. Use strict identity checks instead.
 */
function parseSeverity(severityRaw) {
  if (severityRaw === undefined || severityRaw === null || severityRaw === '') {
    return { severity: null }; // absent/empty → allowed, store null
  }
  const parsed = Number(severityRaw);
  if (!VALID_SEVERITIES.has(parsed)) {
    return { error: `Invalid severity value: ${severityRaw}` };
  }
  return { severity: parsed };
}

/**
 * Validate order_within_item.
 * Same strict-identity rule: 0 is a valid order value, never check with !val.
 */
function parseOrderWithinItem(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return { error: `Invalid order value: ${raw}` };
  }
  const parsed = parseInt(String(raw), 10);
  if (!Number.isFinite(parsed)) {
    return { error: `Invalid order value: ${raw}` };
  }
  return { order_within_item: parsed };
}

/** Parse comma-separated string → trimmed string[] or null (empty string → null). */
export function parseCommaList(val) {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse 0/1/true/false cell value → boolean or null. */
export function parseBool(val) {
  if (val === undefined || val === null || val === '') return null;
  return (
    Number(val) === 1 || val === true || String(val).toLowerCase() === 'true'
  );
}

/**
 * Parse a numeric field (e.g. default_estimate_min/max) → number or null.
 * Uses strict identity for absence — 0 is a valid numeric value.
 */
function parseNumericOrNull(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/** Returns trimmed string or null. */
function trimOrNull(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

/**
 * validateComment — full implementation lives HERE, not in the controller.
 *
 * This is the single source of truth. The parse loop and the confirm
 * re-validation both import and call this function. If validation logic
 * ever needs to change, it changes in one place only.
 *
 * Input `c` may use either the raw spreadsheet header names (during parse)
 * or the DB field names (during confirm re-validation). The caller is
 * responsible for normalising field names before calling this function.
 *
 * Returns { error: string } if the comment fails a strict validation rule,
 * or { fields: object } with every field coerced to its correct type and
 * all strings trimmed, ready to spread directly into a DB insert row.
 *
 * Field coercions applied:
 *   comment_type, answer_type     — trim, check against allowed set
 *   severity                      — parseSeverity (strict identity, not truthiness)
 *   order_within_item             — parseOrderWithinItem (strict identity, parseInt)
 *   locked, simple_format,
 *   disable_photos                — parseBool (0/1 → boolean)
 *   default_estimate_min/max      — parseNumericOrNull (strict identity, Number())
 *   multiple_choice_options,
 *   unit_type_options             — parseCommaList (comma-split, trim, null if empty)
 *   last_modified                 — trimOrNull (passed as string; Postgres parses timestamptz)
 *   all other text fields         — trimOrNull
 */
export function validateComment(c) {
  // --- strict validated fields ---
  const commentType = trimOrNull(c.comment_type) ?? '';
  if (!VALID_COMMENT_TYPES.has(commentType)) {
    return { error: `Invalid comment type: ${c.comment_type}` };
  }

  const answerType = trimOrNull(c.answer_type) ?? '';
  if (!VALID_ANSWER_TYPES.has(answerType)) {
    return { error: `Invalid answer type: ${c.answer_type}` };
  }

  const sev = parseSeverity(c.severity);
  if (sev.error) return { error: sev.error };

  const ord = parseOrderWithinItem(c.order_within_item);
  if (ord.error) return { error: ord.error };

  // --- coerced stored/unused fields ---
  return {
    fields: {
      name: trimOrNull(c.name),
      comment_text: trimOrNull(c.comment_text),
      comment_type: commentType,
      severity: sev.severity,
      multiple_choice_options: parseCommaList(c.multiple_choice_options),
      unit_type_options: parseCommaList(c.unit_type_options),
      order_within_item: ord.order_within_item,
      answer_type: answerType,
      recommendation: trimOrNull(c.recommendation),
      default_value: trimOrNull(c.default_value),
      default_value_2: trimOrNull(c.default_value_2),
      default_unit_type: trimOrNull(c.default_unit_type),
      default_location: trimOrNull(c.default_location),
      default_estimate_min: parseNumericOrNull(c.default_estimate_min), // numeric column — not parseBool
      default_estimate_max: parseNumericOrNull(c.default_estimate_max),
      locked: parseBool(c.locked),
      simple_format: parseBool(c.simple_format),
      disable_photos: parseBool(c.disable_photos),
      uses: trimOrNull(c.uses),
      default_photo_1: trimOrNull(c.default_photo_1),
      default_photo_1_caption: trimOrNull(c.default_photo_1_caption),
      last_modified: trimOrNull(c.last_modified), // string; Postgres parses timestamptz
    },
  };
}

export { parseSeverity, parseOrderWithinItem, parseNumericOrNull, trimOrNull };
