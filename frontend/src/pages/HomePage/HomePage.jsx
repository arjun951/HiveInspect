import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTemplates, getTemplate, updateField, duplicateTemplate, deleteTemplate } from '../../api/templateApi';
import { decodeEntities } from '../../utils/decodeEntities';
import styles from './HomePage.module.css';

// ── Severity badge map ───────────────────────────────────────────────────────
const SEVERITY_MAP = {
  1:    { label: 'High', cls: styles.badgeHigh },
  0:    { label: 'Med',  cls: styles.badgeMed  },
  '-1': { label: 'Low',  cls: styles.badgeLow  },
};

// ── Comment group config ─────────────────────────────────────────────────────
const GROUP_ORDER = ['info', 'limit', 'defect'];
const GROUP_META = {
  info:   { label: 'Information',  cls: styles.groupLabelInfo   },
  limit:  { label: 'Limitations',  cls: styles.groupLabelLimit  },
  defect: { label: 'Deficiencies', cls: styles.groupLabelDefect },
};

// ── Conflict popup ───────────────────────────────────────────────────────────
function ConflictPopup({ onDiscard, onClose }) {
  return (
    <div className={styles.conflictOverlay}>
      <div className={styles.conflictModal}>
        <button className={styles.conflictCloseBtn} onClick={onClose}>✕</button>
        <p className={styles.conflictMsg}>You have unsaved changes.</p>
        <p className={styles.conflictSub}>Navigate away and discard them?</p>
        <button className={styles.conflictDiscardBtn} onClick={onDiscard}>
          Discard changes
        </button>
      </div>
    </div>
  );
}

// ── Duplicate popup ──────────────────────────────────────────────────────────
function DuplicatePopup({ onConfirm, onCancel, error }) {
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  function handleSubmit() {
    if (!name.trim()) {
      setLocalError('Template name cannot be empty.');
      return;
    }
    setLocalError('');
    onConfirm(name.trim());
  }

  return (
    <div className={styles.duplicateOverlay}>
      <div className={styles.duplicateModal}>
        <h2 className={styles.duplicateTitle}>Duplicate Template</h2>
        <p className={styles.duplicateSub}>Enter a name for the new template.</p>
        <input
          className={styles.duplicateInput}
          placeholder="New template name"
          value={name}
          onChange={(e) => { setName(e.target.value); setLocalError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {(localError || error) && (
          <p className={styles.duplicateModalError}>{localError || error}</p>
        )}
        <div className={styles.duplicateActions}>
          <button className={styles.duplicateCancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.duplicateSubmitBtn} onClick={handleSubmit}>Duplicate</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation popup ────────────────────────────────────────────────
function DeleteConfirmPopup({ templateName, onConfirm, onCancel, error }) {
  return (
    <div className={styles.duplicateOverlay}>
      <div className={styles.duplicateModal}>
        <h2 className={styles.duplicateTitle}>Delete Template?</h2>
        <p className={styles.duplicateSub}>
          <strong style={{ color: '#f1f5f9' }}>{templateName}</strong> and all its
          sections, items, and comments will be permanently removed.
          This action cannot be undone.
        </p>
        {error && <p className={styles.duplicateModalError}>{error}</p>}
        <div className={styles.duplicateActions}>
          <button className={styles.duplicateCancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.deleteConfirmBtn} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Page-level blocking loader ───────────────────────────────────────────────
function PageLoader() {
  return (
    <div className={styles.pageLoader}>
      <div className={styles.spinner} />
    </div>
  );
}

// ── Read-only comment card (with inline name + text editing) ─────────────────
function ReadOnlyComment({ comment, editState, onTryStartEdit, onSave, setEditState }) {
  const severity = SEVERITY_MAP[String(comment.severity)];

  const isEditingName = editState?.entityId === comment.id && editState?.field === 'name';
  const isEditingText = editState?.entityId === comment.id && editState?.field === 'comment_text';

  return (
    <div className={styles.commentCard}>
      {/* Comment name */}
      <div className={styles.commentHeader}>
        <div className={styles.editRow} style={{ flex: 1 }}>
          {isEditingName ? (
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  className={styles.editInput}
                  value={editState.currentValue}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, currentValue: e.target.value }))
                  }
                  autoFocus
                  aria-label="Edit comment name"
                />
                <button
                  className={`${styles.editIconBtn} ${styles.saveIconBtn}`}
                  onClick={onSave}
                  disabled={editState.saving}
                  title="Save"
                >
                  {editState.saving ? '…' : '✓'}
                </button>
              </div>
              {editState.error && (
                <p className={styles.editError}>{editState.error}</p>
              )}
            </div>
          ) : (
            <>
              <span className={styles.commentName}>{comment.name}</span>
              <button
                className={styles.editIconBtn}
                onClick={() => onTryStartEdit('comment', comment.id, 'name', comment.name)}
                title="Edit comment name"
              >
                ✏
              </button>
            </>
          )}
        </div>
        <div className={styles.commentMeta}>
          {severity && (
            <span className={`${styles.badge} ${severity.cls}`}>{severity.label}</span>
          )}
          {comment.answer_type && (
            <span className={styles.answerType}>{comment.answer_type}</span>
          )}
        </div>
      </div>

      {/* Comment text */}
      <div>
        {isEditingText ? (
          <div>
            <textarea
              className={styles.editTextarea}
              value={editState.currentValue}
              onChange={(e) =>
                setEditState((prev) => ({ ...prev, currentValue: e.target.value }))
              }
              autoFocus
              aria-label="Edit comment text"
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <button
                className={`${styles.editIconBtn} ${styles.saveIconBtn}`}
                onClick={onSave}
                disabled={editState.saving}
              >
                {editState.saving ? '…' : '✓ Save'}
              </button>
              {editState.error && (
                <p className={styles.editError} style={{ margin: 0 }}>{editState.error}</p>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.editRow}>
            {comment.comment_text ? (
              <div
                className={styles.commentText}
                style={{ flex: 1 }}
                dangerouslySetInnerHTML={{ __html: comment.comment_text }}
              />
            ) : (
              <span style={{ flex: 1, color: '#475569', fontSize: 13, fontStyle: 'italic' }}>
                No description
              </span>
            )}
            <button
              className={styles.editIconBtn}
              onClick={() =>
                onTryStartEdit('comment', comment.id, 'comment_text', comment.comment_text || '')
              }
              title="Edit comment text"
              style={{ marginTop: 4 }}
            >
              ✏
            </button>
          </div>
        )}
      </div>

      {/* Options chips (read-only always) */}
      {comment.multiple_choice_options?.length > 0 && (
        <div className={styles.optionsSection}>
          <span className={styles.optionsLabel}>Options</span>
          <div className={styles.chips}>
            {comment.multiple_choice_options.map((opt, i) => (
              <span key={i} className={styles.chip}>{opt}</span>
            ))}
          </div>
        </div>
      )}
      {comment.unit_type_options?.length > 0 && (
        <div className={styles.optionsSection}>
          <span className={styles.optionsLabel}>Unit Types</span>
          <div className={styles.chips}>
            {comment.unit_type_options.map((opt, i) => (
              <span key={i} className={styles.chip}>{opt}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Read-only section/item tree (left sub-panel) ─────────────────────────────
function ReadOnlyTreePanel({
  sections, selectedItemId, onTrySelectItem,
  editState, onTryStartEdit, onSave, setEditState,
}) {
  return (
    <nav className={styles.detailTree}>
      {sections.map((section) => {
        const isEditingSection =
          editState?.entity === 'section' &&
          editState?.entityId === section.id &&
          editState?.field === 'name';

        return (
          <div key={section.id} className={styles.detailTreeSection}>
            {/* Section name — editable */}
            {isEditingSection ? (
              <div style={{ padding: '0 4px 4px' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    className={styles.editInput}
                    style={{ fontSize: 11, fontWeight: 700 }}
                    value={editState.currentValue}
                    onChange={(e) =>
                      setEditState((prev) => ({ ...prev, currentValue: e.target.value }))
                    }
                    autoFocus
                  />
                  <button
                    className={`${styles.editIconBtn} ${styles.saveIconBtn}`}
                    onClick={onSave}
                    disabled={editState.saving}
                    title="Save"
                  >
                    {editState.saving ? '…' : '✓'}
                  </button>
                </div>
                {editState.error && (
                  <p className={styles.editError}>{editState.error}</p>
                )}
              </div>
            ) : (
              <div className={styles.editRow}>
                <p className={styles.detailTreeSectionName} style={{ flex: 1, margin: 0 }}>
                  {decodeEntities(section.name)}
                </p>
                <button
                  className={styles.editIconBtn}
                  onClick={() =>
                    onTryStartEdit('section', section.id, 'name', section.name)
                  }
                  title="Edit section name"
                >
                  ✏
                </button>
              </div>
            )}

            {/* Items */}
            {section.items.map((item) => (
              <button
                key={item.id}
                className={
                  item.id === selectedItemId
                    ? `${styles.detailTreeItem} ${styles.detailTreeItemActive}`
                    : styles.detailTreeItem
                }
                onClick={() => onTrySelectItem(section.id, item.id)}
              >
                {decodeEntities(item.name)}
              </button>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

// ── Read-only comment panel (right sub-panel) ────────────────────────────────
function ReadOnlyCommentPanel({
  item, editState, onTryStartEdit, onSave, setEditState,
}) {
  if (!item) {
    return (
      <div className={styles.detailCommentPanel}>
        <p className={styles.emptyPanel}>Select an item from the left.</p>
      </div>
    );
  }

  const isEditingItemName =
    editState?.entity === 'item' &&
    editState?.entityId === item.id &&
    editState?.field === 'name';

  const grouped = {};
  for (const type of GROUP_ORDER) grouped[type] = [];
  for (const c of item.comments) {
    if (grouped[c.comment_type]) grouped[c.comment_type].push(c);
    else grouped['info'].push(c);
  }

  return (
    <div className={styles.detailCommentPanel}>
      {/* Item name — editable */}
      <div style={{ paddingBottom: 12, borderBottom: '1px solid #2d3144' }}>
        {isEditingItemName ? (
          <div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className={styles.editInput}
                style={{ fontSize: 16, fontWeight: 700 }}
                value={editState.currentValue}
                onChange={(e) =>
                  setEditState((prev) => ({ ...prev, currentValue: e.target.value }))
                }
                autoFocus
              />
              <button
                className={`${styles.editIconBtn} ${styles.saveIconBtn}`}
                onClick={onSave}
                disabled={editState.saving}
                title="Save"
              >
                {editState.saving ? '…' : '✓'}
              </button>
            </div>
            {editState.error && (
              <p className={styles.editError}>{editState.error}</p>
            )}
          </div>
        ) : (
          <div className={styles.editRow}>
            <p className={styles.detailItemName} style={{ margin: 0, flex: 1 }}>
              {decodeEntities(item.name)}
            </p>
            <button
              className={styles.editIconBtn}
              onClick={() => onTryStartEdit('item', item.id, 'name', item.name)}
              title="Edit item name"
            >
              ✏
            </button>
          </div>
        )}
      </div>

      {/* Comments grouped by type */}
      {GROUP_ORDER.map((type) => {
        if (!grouped[type].length) return null;
        const meta = GROUP_META[type];
        return (
          <div key={type} className={styles.detailGroup}>
            <div className={styles.detailGroupHeader}>
              <span className={`${styles.detailGroupLabel} ${meta.cls}`}>
                {meta.label}
              </span>
              <span className={styles.detailGroupCount}>{grouped[type].length}</span>
            </div>
            <div className={styles.detailGroupCards}>
              {grouped[type].map((c) => (
                <ReadOnlyComment
                  key={c.id}
                  comment={{
                    ...c,
                    name: decodeEntities(c.name),
                    comment_text: decodeEntities(c.comment_text),
                  }}
                  editState={editState}
                  onTryStartEdit={onTryStartEdit}
                  onSave={onSave}
                  setEditState={setEditState}
                />
              ))}
            </div>
          </div>
        );
      })}

      {item.comments.length === 0 && (
        <p className={styles.emptyPanel}>No comments for this item.</p>
      )}
    </div>
  );
}

// ── Template detail (fills rightPanel when a template is selected) ────────────
function TemplateDetail({
  template,
  editState, setEditState,
  onTryStartEdit, onSave, onTryNavigate,
}) {
  const importFlagsCount = template.import_flags?.length ?? 0;

  const [selectedSectionId, setSelectedSectionId] = useState(
    template.sections[0]?.id ?? null,
  );
  const [selectedItemId, setSelectedItemId] = useState(
    template.sections[0]?.items[0]?.id ?? null,
  );

  const selectedItem =
    template.sections
      .find((s) => s.id === selectedSectionId)
      ?.items.find((it) => it.id === selectedItemId) ?? null;

  function handleTrySelectItem(sectionId, itemId) {
    onTryNavigate(() => {
      setSelectedSectionId(sectionId);
      setSelectedItemId(itemId);
    });
  }

  const isEditingTemplateName =
    editState?.entity === 'template' &&
    editState?.entityId === template.id &&
    editState?.field === 'name';

  return (
    <div className={styles.detail}>
      {/* Header: template name (editable) + date + flags */}
      <div className={styles.detailHeader}>
        <div style={{ marginBottom: 8 }}>
          {isEditingTemplateName ? (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className={styles.editInput}
                  style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}
                  value={editState.currentValue}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, currentValue: e.target.value }))
                  }
                  autoFocus
                />
                <button
                  className={`${styles.editIconBtn} ${styles.saveIconBtn}`}
                  onClick={onSave}
                  disabled={editState.saving}
                  title="Save"
                >
                  {editState.saving ? '…' : '✓'}
                </button>
              </div>
              {editState.error && (
                <p className={styles.editError}>{editState.error}</p>
              )}
            </div>
          ) : (
            <div className={styles.editRow}>
              <h1 className={styles.detailTitle} style={{ margin: 0, flex: 1 }}>
                {template.name}
              </h1>
              <button
                className={styles.editIconBtn}
                onClick={() =>
                  onTryStartEdit('template', template.id, 'name', template.name)
                }
                title="Edit template name"
                style={{ fontSize: 16 }}
              >
                ✏
              </button>
            </div>
          )}
        </div>
        <div className={styles.detailMeta}>
          <span className={styles.detailDate}>
            {new Date(template.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </span>
          {importFlagsCount > 0 && (
            <span className={styles.importFlagsBadge}>
              {importFlagsCount} unsupported column{importFlagsCount !== 1 ? 's' : ''} on import
            </span>
          )}
        </div>
      </div>

      {/* Sub two-column body */}
      {template.sections.length === 0 ? (
        <p className={styles.emptyPanel} style={{ padding: '24px' }}>
          This template has no sections.
        </p>
      ) : (
        <div className={styles.detailBody}>
          <ReadOnlyTreePanel
            sections={template.sections}
            selectedItemId={selectedItemId}
            onTrySelectItem={handleTrySelectItem}
            editState={editState}
            onTryStartEdit={onTryStartEdit}
            onSave={onSave}
            setEditState={setEditState}
          />
          <ReadOnlyCommentPanel
            item={selectedItem}
            editState={editState}
            onTryStartEdit={onTryStartEdit}
            onSave={onSave}
            setEditState={setEditState}
          />
        </div>
      )}
    </div>
  );
}

// ── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();

  // Template list
  const [templates, setTemplates] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Selected template detail
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Edit state (lifted here so template-switch can also be guarded)
  // null | { entity, entityId, field, originalValue, currentValue, saving, error }
  const [editState, setEditState] = useState(null);

  // Navigation action pending confirmation (null = popup closed)
  const [conflictAction, setConflictAction] = useState(null);

  // 3-dot card menu
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Duplicate popup
  const [duplicateSource, setDuplicateSource] = useState(null); // { id, name } | null
  const [duplicateError, setDuplicateError] = useState('');

  // Page-level loader (also covers editState.saving via JSX)
  const [duplicating, setDuplicating] = useState(false);

  // Delete confirmation popup
  const [deleteSource, setDeleteSource] = useState(null); // { id, name } | null
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    setListLoading(true);
    setListError('');
    listTemplates()
      .then((data) => setTemplates(data))
      .catch((err) => setListError(err.message))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setDetailError('');
    setSelectedTemplate(null);
    setEditState(null);
    getTemplate(selectedId)
      .then((data) => setSelectedTemplate(data))
      .catch((err) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  // ── Navigation guard ───────────────────────────────────────────────────────

  // Any navigation that might lose unsaved edits goes through here.
  function tryNavigate(action) {
    if (editState !== null) {
      setConflictAction(() => action); // store the action; popup appears
    } else {
      action();
    }
  }

  // Any ✏ click goes through here (also guards against double-editing).
  function tryStartEdit(entity, entityId, field, currentValue) {
    const doStart = () =>
      setEditState({
        entity, entityId, field,
        originalValue: currentValue,
        currentValue,
        saving: false,
        error: null,
      });
    if (editState !== null) {
      setConflictAction(() => doStart);
    } else {
      doStart();
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!editState) return;
    const { entity, entityId, field, currentValue } = editState;

    // Frontend validation (backend also validates)
    if (field === 'name' && !String(currentValue ?? '').trim()) {
      setEditState((prev) => ({ ...prev, error: `${entity} name cannot be empty.` }));
      return;
    }

    setEditState((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const saved = field === 'name' ? currentValue.trim() : (currentValue ?? '');
      await updateField(selectedTemplate.id, entity, entityId, field, saved);
      handleFieldUpdated(entity, entityId, field, saved);
      setEditState(null);
    } catch (err) {
      setEditState((prev) => ({ ...prev, saving: false, error: err.message }));
    }
  }

  // ── Local state update after successful save ───────────────────────────────

  function handleFieldUpdated(entity, entityId, field, value) {
    if (entity === 'template') {
      // Also update the name shown in the left-panel card
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedId ? { ...t, name: value } : t)),
      );
      setSelectedTemplate((prev) => ({ ...prev, name: value }));
      return;
    }
    if (entity === 'section') {
      setSelectedTemplate((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === entityId ? { ...s, name: value } : s,
        ),
      }));
      return;
    }
    if (entity === 'item') {
      setSelectedTemplate((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          items: s.items.map((it) =>
            it.id === entityId ? { ...it, name: value } : it,
          ),
        })),
      }));
      return;
    }
    if (entity === 'comment') {
      setSelectedTemplate((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          items: s.items.map((it) => ({
            ...it,
            comments: it.comments.map((c) =>
              c.id === entityId ? { ...c, [field]: value } : c,
            ),
          })),
        })),
      }));
    }
  }

  // ── Duplicate ─────────────────────────────────────────────────────────────

  async function handleDuplicate(newName) {
    const sourceId = duplicateSource.id;
    setDuplicateSource(null);  // close popup
    setDuplicateError('');
    setDuplicating(true);
    try {
      const newTemplate = await duplicateTemplate(sourceId, newName);
      // Prepend to the list (API returns newest-first; duplicate is brand new)
      setTemplates((prev) => [newTemplate, ...prev]);
    } catch (err) {
      // Reopen popup with the error
      setDuplicateError(err.message);
      setDuplicateSource({ id: sourceId, name: newName });
    } finally {
      setDuplicating(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    const sourceId = deleteSource.id;
    setDeleteSource(null);   // close popup
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteTemplate(sourceId);
      // Remove from list
      setTemplates((prev) => prev.filter((t) => t.id !== sourceId));
      // Clear detail panel if the deleted template was selected
      if (selectedId === sourceId) {
        setSelectedId(null);
        setSelectedTemplate(null);
        setEditState(null);
      }
    } catch (err) {
      // Reopen popup with the error
      setDeleteError(err.message);
      setDeleteSource({ id: sourceId });
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Hive</span>
        <button className={styles.importBtn} onClick={() => navigate('/import')}>
          + Import template
        </button>
      </header>

      <div className={styles.body}>
        {/* Left panel — template list */}
        <nav className={styles.leftPanel}>
          <p className={styles.leftHeading}>Templates</p>

          {listLoading && <p className={styles.listStatus}>Loading…</p>}
          {listError   && <p className={styles.listError}>{listError}</p>}
          {!listLoading && !listError && templates.length === 0 && (
            <p className={styles.listStatus}>No templates yet.</p>
          )}

          {/* Backdrop to close the 3-dot menu when clicking outside */}
          {menuOpenId && (
            <div
              className={styles.cardMenuBackdrop}
              onClick={() => setMenuOpenId(null)}
            />
          )}

          {templates.map((t) => (
            <div key={t.id} className={styles.templateCardWrapper}>
              <button
                className={
                  t.id === selectedId
                    ? `${styles.templateCard} ${styles.templateCardActive}`
                    : styles.templateCard
                }
                onClick={() => tryNavigate(() => setSelectedId(t.id))}
              >
                <span className={styles.templateCardName}>{t.name}</span>
                <span className={styles.templateCardDate}>
                  {new Date(t.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </button>

              {/* 3-dot menu trigger */}
              <div className={styles.cardMenuContainer}>
                <button
                  className={styles.threeDotsBtn}
                  title="More options"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId((prev) => (prev === t.id ? null : t.id));
                  }}
                >
                  ⋯
                </button>
                {menuOpenId === t.id && (
                  <div className={styles.cardMenu}>
                    <button
                      className={styles.cardMenuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setDuplicateError('');
                        setDuplicateSource({ id: t.id, name: t.name });
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      className={`${styles.cardMenuItem} ${styles.cardMenuItemDanger}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setDeleteError('');
                        setDeleteSource({ id: t.id, name: t.name });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Right panel — detail or placeholder */}
        <main className={styles.rightPanel}>
          {!selectedId && (
            <div className={styles.placeholder}>
              <p className={styles.placeholderText}>Select a template to view its details</p>
            </div>
          )}
          {selectedId && detailLoading && (
            <div className={styles.placeholder}>
              <p className={styles.placeholderText}>Loading…</p>
            </div>
          )}
          {selectedId && detailError && (
            <div className={styles.placeholder}>
              <p className={styles.listError}>{detailError}</p>
            </div>
          )}
          {selectedTemplate && !detailLoading && (
            <TemplateDetail
              template={selectedTemplate}
              editState={editState}
              setEditState={setEditState}
              onTryStartEdit={tryStartEdit}
              onSave={handleSave}
              onTryNavigate={tryNavigate}
            />
          )}
        </main>
      </div>

      {/* Conflict popup */}
      {conflictAction && (
        <ConflictPopup
          onDiscard={() => {
            setEditState(null);
            conflictAction();
            setConflictAction(null);
          }}
          onClose={() => setConflictAction(null)}
        />
      )}

      {/* Duplicate popup */}
      {duplicateSource && (
        <DuplicatePopup
          error={duplicateError}
          onConfirm={handleDuplicate}
          onCancel={() => { setDuplicateSource(null); setDuplicateError(''); }}
        />
      )}

      {/* Delete confirmation popup */}
      {deleteSource && (
        <DeleteConfirmPopup
          templateName={deleteSource.name}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteSource(null); setDeleteError(''); }}
        />
      )}

      {/* Page-level loader — shown during duplication, deletion, OR edit save */}
      {(duplicating || deleting || editState?.saving) && <PageLoader />}
    </div>
  );
}
