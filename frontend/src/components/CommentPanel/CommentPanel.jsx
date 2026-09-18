import CommentCard from '../CommentCard/CommentCard';
import styles from './CommentPanel.module.css';

const GROUP_ORDER = ['info', 'limit', 'defect'];
const GROUP_META = {
  info: { label: 'Information', cls: styles.groupLabelInfo },
  limit: { label: 'Limitations', cls: styles.groupLabelLimit },
  defect: { label: 'Deficiencies', cls: styles.groupLabelDefect },
};

/**
 * Right panel — shows the selected item's comments grouped by type.
 * Item name is inline editable at the top.
 * unsupportedColumns warning is shown if present.
 * invalidCommentIds is a Map<tempId, reason> from confirm 400 errors.
 */
export default function CommentPanel({
  item,
  unsupportedColumns,
  invalidCommentMap,
  onItemNameChange,
  onCommentChange,
}) {
  if (!item) {
    return (
      <div className={styles.panel}>
        <p className={styles.empty}>Select an item from the left panel.</p>
      </div>
    );
  }

  // Group comments by type
  const grouped = {};
  for (const type of GROUP_ORDER) grouped[type] = [];
  for (const comment of item.comments) {
    const key = comment.comment_type;
    if (grouped[key]) grouped[key].push(comment);
    else grouped['info'].push(comment); // fallback
  }

  return (
    <div className={styles.panel}>
      <input
        className={styles.itemNameInput}
        value={item.name}
        onChange={(e) => onItemNameChange(e.target.value)}
        aria-label="Item name"
      />

      {unsupportedColumns && unsupportedColumns.length > 0 && (
        <div className={styles.unsupportedBanner}>
          {unsupportedColumns.length} column{unsupportedColumns.length > 1 ? 's' : ''} not imported:{' '}
          {unsupportedColumns.join(', ')}
        </div>
      )}

      {GROUP_ORDER.map((type) => {
        const comments = grouped[type];
        if (comments.length === 0) return null;
        const meta = GROUP_META[type];
        return (
          <div key={type} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={`${styles.groupLabel} ${meta.cls}`}>{meta.label}</span>
              <span className={styles.groupCount}>{comments.length}</span>
            </div>
            <div className={styles.cards}>
              {comments.map((comment) => (
                <CommentCard
                  key={comment.tempId}
                  comment={comment}
                  invalidReason={invalidCommentMap?.get(comment.tempId)}
                  onCommentChange={(field, value) =>
                    onCommentChange(comment.tempId, field, value)
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
