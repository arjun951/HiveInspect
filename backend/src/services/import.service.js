/**
 * import.service.js
 *
 * Single responsibility: Supabase DB writes for the confirm phase.
 * All coercion and validation logic lives in importValidation.js.
 * By the time confirmImport is called, every comment has already been
 * validated and coerced by validateComment in the controller.
 */

import { supabase } from '../config/supabase.js';

export async function confirmImport({ templateName, tree, unsupportedColumns }) {
  // 1. Insert template — destructure error, throw immediately on failure
  const { data: tmpl, error: tmplError } = await supabase
    .from('templates')
    .insert({ name: templateName, import_flags: unsupportedColumns })
    .select()
    .single();
  if (tmplError) throw new Error(`Failed to insert template: ${tmplError.message}`);

  try {
    // 2. Batch insert sections
    // Build index → tempId map BEFORE insert so we can correlate after.
    // Supabase/PostgREST does NOT guarantee .select() returns rows in insertion
    // order, so we correlate by order_index (which we control), not array position.
    const indexToSectionTempId = new Map(tree.map((s, i) => [i, s.tempId]));

    const { data: savedSections, error: sectionsError } = await supabase
      .from('sections')
      .insert(
        tree.map((s, i) => ({
          template_id: tmpl.id,
          name: s.name,
          order_index: i,
        })),
      )
      .select();
    if (sectionsError)
      throw new Error(`Failed to insert sections: ${sectionsError.message}`);

    // Match returned rows by order_index (not array position) → tempId → real UUID
    const sectionTempIdToRealId = new Map(
      savedSections.map((row) => [indexToSectionTempId.get(row.order_index), row.id]),
    );

    // 3. Batch insert items
    // Flat list carries tempId + parent section tempId + order_index (scoped per section).
    // order_index is NOT unique across the whole insert (item 0 of Section A and item 0
    // of Section B both have order_index = 0), so we use a compound key
    // `${sectionRealId}:${orderIndex}` to correlate after insert.
    const flatItems = tree.flatMap((s) =>
      s.items.map((it, i) => ({
        tempId: it.tempId,
        sectionTempId: s.tempId,
        orderIndex: i,
        name: it.name,
      })),
    );

    const { data: savedItems, error: itemsError } = await supabase
      .from('items')
      .insert(
        flatItems.map((it) => ({
          section_id: sectionTempIdToRealId.get(it.sectionTempId),
          name: it.name,
          order_index: it.orderIndex,
        })),
      )
      .select();
    if (itemsError)
      throw new Error(`Failed to insert items: ${itemsError.message}`);

    // Build compound-key → tempId map, then match returned rows
    const compoundToItemTempId = new Map(
      flatItems.map((it) => [
        `${sectionTempIdToRealId.get(it.sectionTempId)}:${it.orderIndex}`,
        it.tempId,
      ]),
    );
    const itemTempIdToRealId = new Map(
      savedItems.map((row) => [
        compoundToItemTempId.get(`${row.section_id}:${row.order_index}`),
        row.id,
      ]),
    );

    // 4. Batch insert comments
    // No mapCommentFields here — validateComment (called in the controller before
    // this service is ever reached) has already coerced every field to its correct
    // type: trimmed strings, real numbers, real integers, real booleans, real arrays.
    // Spread the comment directly; only inject item_id from our real-UUID map.
    // Also strip tempId — it's a client-side handle, not a DB column.
    const allComments = tree.flatMap((s) =>
      s.items.flatMap((it) =>
        it.comments.map(({ tempId: _tempId, ...c }) => ({
          item_id: itemTempIdToRealId.get(it.tempId),
          ...c,
        })),
      ),
    );
    const { error: commentsError } = await supabase
      .from('comments')
      .insert(allComments);
    if (commentsError)
      throw new Error(`Failed to insert comments: ${commentsError.message}`);

    return tmpl.id;
  } catch (err) {
    // Delete the template — FK ON DELETE CASCADE removes sections/items/comments
    await supabase.from('templates').delete().eq('id', tmpl.id);
    throw err;
  }
}
