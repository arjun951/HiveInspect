import { useState } from 'react';
import styles from './CommentCard.module.css';

const SEVERITY_MAP = {
  1: { label: 'High', cls: styles.badgeHigh },
  0: { label: 'Med', cls: styles.badgeMed },
  '-1': { label: 'Low', cls: styles.badgeLow },
};

/**
 * Single comment card with:
 * - Editable name input
 * - Severity badge (High/Med/Low)
 * - Answer type label
 * - Toggle-edit comment_text: rendered HTML by default, raw textarea on click
 * - Read-only chips for multiple_choice_options and unit_type_options
 * - Optional invalid reason (from confirm 400 response)
 *
 * All edits call onCommentChange(field, value) — the parent spreads the
 * existing comment object and overrides only the changed field, preserving tempId.
 */
export default function CommentCard({ comment, invalidReason, onCommentChange }) {
  const severity = SEVERITY_MAP[String(comment.severity)];
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={`${styles.card} ${invalidReason ? styles.cardInvalid : ''}`}>
      <div className={styles.header}>
        <input
          className={styles.nameInput}
          value={comment.name || ''}
          onChange={(e) => onCommentChange('name', e.target.value)}
          aria-label="Comment name"
        />
        <div className={styles.meta}>
          {severity && (
            <span className={`${styles.badge} ${severity.cls}`}>
              {severity.label}
            </span>
          )}
          {comment.answer_type && (
            <span className={styles.answerType}>{comment.answer_type}</span>
          )}
        </div>
      </div>

      {/* comment_text: rendered HTML preview ↔ raw textarea toggle */}
      {isEditing ? (
        <textarea
          className={styles.textArea}
          value={comment.comment_text || ''}
          onChange={(e) => onCommentChange('comment_text', e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
          aria-label="Comment text"
        />
      ) : (
        <div
          className={styles.htmlPreview}
          onClick={() => setIsEditing(true)}
          title="Click to edit"
          dangerouslySetInnerHTML={{
            __html: comment.comment_text
              || '<em style="opacity:0.4">Click to add text…</em>',
          }}
        />
      )}

      {/* Read-only chips for multiple choice options */}
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

      {/* Read-only chips for unit type options */}
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

      {invalidReason && (
        <p className={styles.invalidReason}>⚠ {invalidReason}</p>
      )}
    </div>
  );
}
