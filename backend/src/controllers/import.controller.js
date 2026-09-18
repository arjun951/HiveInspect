import xlsx from 'xlsx';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  KNOWN_COLUMNS,
  validateComment,
} from '../utils/importValidation.js';
import { confirmImport as confirmImportService } from '../services/import.service.js';

// ---------------------------------------------------------------------------
// Column header → normalised DB field name map
// (only the non-structural comment fields)
// ---------------------------------------------------------------------------
const HEADER_TO_FIELD = {
  'Comment Name': 'name',
  'Comment Text': 'comment_text',
  'Comment Type (info, limit, defect)': 'comment_type',
  'Category (-1: Low, 0: Med, 1: High)': 'severity',
  'Multiple Choice Options (comma-separated)': 'multiple_choice_options',
  'Unit Type Options (numeric answers only, comma-separated)': 'unit_type_options',
  'Order (w/i item)': 'order_within_item',
  'Answer Type (boolean, checkbox, date, number, range, text)': 'answer_type',
  'Recommendation (from list)': 'recommendation',
  'Default Value': 'default_value',
  'Default Value 2 (for "range" types)': 'default_value_2',
  'Default Unit Type (for "number" and "range" types)': 'default_unit_type',
  'Default Location': 'default_location',
  'Default Estimate Min': 'default_estimate_min',
  'Default Estimate Max': 'default_estimate_max',
  Locked: 'locked',
  'Simple Format': 'simple_format',
  'Disable Photos': 'disable_photos',
  Uses: 'uses',
  'Default Photo 1': 'default_photo_1',
  'Default Photo 1 Caption': 'default_photo_1_caption',
  'Last Modified': 'last_modified',
};

// ---------------------------------------------------------------------------
// POST /api/import/parse
// ---------------------------------------------------------------------------
export const parseXlsx = asyncHandler(async (req, res) => {
  if (!req.file?.buffer) {
    throw new ApiError(400, 'Upload an .xlsx file using the "file" field');
  }

  let workbook;
  try {
    workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
  } catch {
    throw new ApiError(400, 'Unable to read the uploaded file — is it a valid .xlsx?');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ApiError(400, 'The XLSX file has no sheets');
  }

  // Convert to array of row objects keyed by header string
  // defval: null so missing cells are null rather than undefined
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: null,
    raw: true,
  });

  if (rows.length === 0) {
    throw new ApiError(400, 'The sheet is empty or has no data rows');
  }

  // Determine actual headers from the first row's keys
  const actualHeaders = Object.keys(rows[0]);

  // -------------------------------------------------------------------------
  // Identify unsupported columns (once per unique unrecognised header)
  // -------------------------------------------------------------------------
  const unsupportedColumns = actualHeaders.filter((h) => !KNOWN_COLUMNS.has(h));

  // -------------------------------------------------------------------------
  // Build the tree — sections preserve first-seen order across the whole file
  // -------------------------------------------------------------------------
  const sectionMap = new Map(); // sectionName → { tempId, name, itemMap }
  const sectionOrder = []; // tracks first-seen section order
  const skippedRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // 1-based, +1 for header row

    const sectionName =
      row['Section Name'] !== null && row['Section Name'] !== undefined
        ? String(row['Section Name']).trim()
        : '';
    const itemName =
      row['Item Name'] !== null && row['Item Name'] !== undefined
        ? String(row['Item Name']).trim()
        : '';
    const commentName =
      row['Comment Name'] !== null && row['Comment Name'] !== undefined
        ? String(row['Comment Name']).trim()
        : '';

    // Check structural fields in order — report only the first failure per row
    if (!sectionName) {
      skippedRows.push({ rowNumber, reason: 'Empty section name' });
      continue;
    }
    if (!itemName) {
      skippedRows.push({ rowNumber, reason: 'Empty item name' });
      continue;
    }
    if (!commentName) {
      skippedRows.push({ rowNumber, reason: 'Empty comment name' });
      continue;
    }

    // Normalise all comment fields from spreadsheet header names → DB field names
    const rawComment = { name: commentName };
    for (const [header, field] of Object.entries(HEADER_TO_FIELD)) {
      // Skip Comment Name — already set above; skip unsupported column values
      if (header === 'Comment Name') continue;
      rawComment[field] = row[header] ?? null;
    }

    // Validate and coerce via the shared validator
    const result = validateComment(rawComment);
    if (result.error) {
      skippedRows.push({ rowNumber, reason: result.error });
      continue;
    }

    // Build tree — find or create section
    if (!sectionMap.has(sectionName)) {
      const section = {
        tempId: crypto.randomUUID(),
        name: sectionName,
        itemMap: new Map(),
        itemOrder: [],
      };
      sectionMap.set(sectionName, section);
      sectionOrder.push(sectionName);
    }
    const section = sectionMap.get(sectionName);

    // Find or create item within section
    if (!section.itemMap.has(itemName)) {
      const item = {
        tempId: crypto.randomUUID(),
        name: itemName,
        comments: [],
      };
      section.itemMap.set(itemName, item);
      section.itemOrder.push(itemName);
    }
    const item = section.itemMap.get(itemName);

    // Append comment with its own tempId
    item.comments.push({
      tempId: crypto.randomUUID(),
      ...result.fields,
    });
  }

  // Serialise tree (drop internal Maps)
  const tree = sectionOrder.map((sName) => {
    const s = sectionMap.get(sName);
    return {
      tempId: s.tempId,
      name: s.name,
      items: s.itemOrder.map((iName) => {
        const it = s.itemMap.get(iName);
        return {
          tempId: it.tempId,
          name: it.name,
          comments: it.comments,
        };
      }),
    };
  });

  res.json({
    success: true,
    data: { tree, unsupportedColumns, skippedRows },
  });
});

// ---------------------------------------------------------------------------
// POST /api/import/confirm
// ---------------------------------------------------------------------------
export const confirmImport = asyncHandler(async (req, res) => {
  const { templateName, tree, unsupportedColumns } = req.body ?? {};

  if (!templateName || typeof templateName !== 'string' || !templateName.trim()) {
    throw new ApiError(400, '"templateName" is required');
  }
  if (!Array.isArray(tree)) {
    throw new ApiError(400, '"tree" must be an array');
  }

  // -------------------------------------------------------------------------
  // Defensive re-validation — never trust client input
  // Intentional asymmetry: parse skips bad rows; confirm rejects the WHOLE
  // request and returns ALL failing comments so the client knows exactly
  // what is wrong.
  // -------------------------------------------------------------------------
  const invalidComments = [];

  for (const section of tree) {
    for (const item of section.items ?? []) {
      for (const comment of item.comments ?? []) {
        const result = validateComment(comment);
        if (result.error) {
          invalidComments.push({ tempId: comment.tempId, reason: result.error });
        } else {
          // Replace raw fields with coerced fields in-place so the service
          // receives already-coerced data without a separate mapping step
          Object.assign(comment, result.fields);
        }
      }
    }
  }

  if (invalidComments.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed on submitted data',
      invalidComments,
    });
  }

  const templateId = await confirmImportService({
    templateName: templateName.trim(),
    tree,
    unsupportedColumns: Array.isArray(unsupportedColumns) ? unsupportedColumns : [],
  });

  res.status(201).json({ success: true, data: { templateId } });
});
