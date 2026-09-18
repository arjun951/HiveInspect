/**
 * templates.service.js
 *
 * Queries for listing, fetching, and updating templates and their
 * nested entities (sections, items, comments).
 */

import { supabase } from '../config/supabase.js';

/**
 * Returns all templates ordered newest-first.
 * @returns {Promise<Array<{id, name, created_at, import_flags}>>}
 */
export async function listTemplates() {
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, created_at, import_flags')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to list templates: ${error.message}`);
  return data;
}

/**
 * Returns one template with its full nested tree.
 * Performs 4 sequential Supabase queries and stitches the result in memory.
 * @param {string} id - template UUID
 * @returns {Promise<{id, name, created_at, import_flags, sections: Array}>}
 */
export async function getTemplateById(id) {
  // 1. Fetch template row
  const { data: template, error: tmplErr } = await supabase
    .from('templates')
    .select('id, name, created_at, import_flags')
    .eq('id', id)
    .single();
  if (tmplErr) throw new Error(`Template not found: ${tmplErr.message}`);

  // 2. Fetch sections
  const { data: sections, error: sectionsErr } = await supabase
    .from('sections')
    .select('id, name, order_index')
    .eq('template_id', id)
    .order('order_index');
  if (sectionsErr) throw new Error(`Failed to fetch sections: ${sectionsErr.message}`);

  if (!sections.length) {
    return { ...template, sections: [] };
  }

  // 3. Fetch items for all sections
  const sectionIds = sections.map((s) => s.id);
  const { data: items, error: itemsErr } = await supabase
    .from('items')
    .select('id, section_id, name, order_index')
    .in('section_id', sectionIds)
    .order('order_index');
  if (itemsErr) throw new Error(`Failed to fetch items: ${itemsErr.message}`);

  if (!items.length) {
    return {
      ...template,
      sections: sections.map((s) => ({ ...s, items: [] })),
    };
  }

  // 4. Fetch comments for all items
  const itemIds = items.map((it) => it.id);
  const { data: comments, error: commentsErr } = await supabase
    .from('comments')
    .select('*')
    .in('item_id', itemIds)
    .order('order_within_item');
  if (commentsErr) throw new Error(`Failed to fetch comments: ${commentsErr.message}`);

  // 5. Stitch: comments → items → sections
  const itemMap = new Map(items.map((it) => [it.id, { ...it, comments: [] }]));
  for (const c of comments) {
    itemMap.get(c.item_id)?.comments.push(c);
  }

  const sectionMap = new Map(
    sections.map((s) => [s.id, { ...s, items: [] }]),
  );
  for (const it of itemMap.values()) {
    sectionMap.get(it.section_id)?.items.push(it);
  }

  return {
    ...template,
    sections: Array.from(sectionMap.values()),
  };
}

// ── Template duplication ──────────────────────────────────────────────────────

/**
 * Deep-copies a template and all its sections, items, and comments.
 * Rolls back (cascade delete) if any insert step fails.
 * @param {string} sourceId - UUID of the template to copy
 * @param {string} newName  - name for the new template
 * @returns {Promise<{id, name, created_at, import_flags}>} the new template row
 */
export async function duplicateTemplate(sourceId, newName) {
  // 1. Load the full source tree (reuse existing function — no extra queries)
  const source = await getTemplateById(sourceId);

  // 2. Insert new template row
  const { data: newTemplate, error: tmplErr } = await supabase
    .from('templates')
    .insert({ name: newName, import_flags: source.import_flags ?? [] })
    .select('id, name, created_at, import_flags')
    .single();
  if (tmplErr) throw new Error(`Failed to create duplicate template: ${tmplErr.message}`);

  try {
    // 3. Insert sections — build oldId → newId map
    const sectionIdMap = new Map();
    if (source.sections.length > 0) {
      const sectionRows = source.sections.map((s) => ({
        template_id: newTemplate.id,
        name: s.name,
        order_index: s.order_index,
      }));
      const { data: newSections, error: sectErr } = await supabase
        .from('sections')
        .insert(sectionRows)
        .select('id, order_index');
      if (sectErr) throw new Error(`Failed to duplicate sections: ${sectErr.message}`);

      // Map by order_index (same as confirmImport's approach)
      for (const orig of source.sections) {
        const created = newSections.find((s) => s.order_index === orig.order_index);
        if (created) sectionIdMap.set(orig.id, created.id);
      }
    }

    // 4. Insert items — build oldId → newId map
    const itemIdMap = new Map();
    const allItems = source.sections.flatMap((s) =>
      s.items.map((it) => ({ ...it, _sectionId: s.id })),
    );
    if (allItems.length > 0) {
      const itemRows = allItems.map((it) => ({
        section_id: sectionIdMap.get(it._sectionId),
        name: it.name,
        order_index: it.order_index,
      }));
      const { data: newItems, error: itemErr } = await supabase
        .from('items')
        .insert(itemRows)
        .select('id, section_id, order_index');
      if (itemErr) throw new Error(`Failed to duplicate items: ${itemErr.message}`);

      // Map by (newSectionId, order_index) compound key
      for (const orig of allItems) {
        const newSectionId = sectionIdMap.get(orig._sectionId);
        const created = newItems.find(
          (it) => it.section_id === newSectionId && it.order_index === orig.order_index,
        );
        if (created) itemIdMap.set(orig.id, created.id);
      }
    }

    // 5. Insert comments — spread all fields, remap item_id
    const allComments = source.sections.flatMap((s) =>
      s.items.flatMap((it) => it.comments.map((c) => ({ ...c, _itemId: it.id }))),
    );
    if (allComments.length > 0) {
      const commentRows = allComments.map(({ id, _itemId, item_id, ...rest }) => ({
        item_id: itemIdMap.get(_itemId),
        ...rest,
      }));
      const { error: commErr } = await supabase.from('comments').insert(commentRows);
      if (commErr) throw new Error(`Failed to duplicate comments: ${commErr.message}`);
    }
  } catch (err) {
    // Cascade-safe rollback — FK ON DELETE CASCADE cleans up sections/items/comments
    await supabase.from('templates').delete().eq('id', newTemplate.id);
    throw err;
  }

  return newTemplate;
}

// ── Template deletion ─────────────────────────────────────────────────────────

/**
 * Permanently deletes a template row.
 * FK ON DELETE CASCADE removes all sections, items, and comments automatically.
 * @param {string} id - template UUID
 */
export async function deleteTemplate(id) {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete template: ${error.message}`);
}

// ── Field-level update ────────────────────────────────────────────────────────

const TABLE_MAP = {
  template: 'templates',
  section:  'sections',
  item:     'items',
  comment:  'comments',
};

/**
 * Updates a single field on any entity in the template hierarchy.
 * @param {'template'|'section'|'item'|'comment'} entity
 * @param {string} entityId - UUID of the row to update
 * @param {'name'|'comment_text'} field
 * @param {string} value - already trimmed by the controller
 */
export async function updateTemplateField(entity, entityId, field, value) {
  const { error } = await supabase
    .from(TABLE_MAP[entity])
    .update({ [field]: value })
    .eq('id', entityId);
  if (error) throw new Error(`Failed to update ${entity} ${field}: ${error.message}`);
}
