import { useState } from 'react';
import { confirmImport } from '../../api/importApi';
import styles from './ConfirmModal.module.css';

/**
 * Modal for confirming the import.
 * - Takes template name input
 * - Calls POST /api/import/confirm
 * - On success: calls onSuccess(templateId)
 * - On invalidComments 400: calls onInvalidComments(map) and closes
 * - On other error: shows inline error message
 */
export default function ConfirmModal({
  tree,
  unsupportedColumns,
  onCancel,
  onSuccess,
  onInvalidComments,
}) {
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!templateName.trim()) {
      setError('Template name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { templateId } = await confirmImport(
        templateName.trim(),
        tree,
        unsupportedColumns,
      );
      onSuccess(templateId);
    } catch (err) {
      // err is the raw json from the server
      if (err.invalidComments && err.invalidComments.length > 0) {
        // Build a Map<tempId, reason> and hand it back to the review page
        const map = new Map(err.invalidComments.map((c) => [c.tempId, c.reason]));
        onInvalidComments(map);
      } else {
        setError(err.message || 'Save failed. Please try again.');
        setSaving(false);
      }
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h2 className={styles.title}>Save template</h2>

        <label className={styles.label}>
          Template name
          <input
            className={styles.input}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. Standard Residential Inspection"
            disabled={saving}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !templateName.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
