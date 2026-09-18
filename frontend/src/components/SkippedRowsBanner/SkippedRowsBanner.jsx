import { useState } from 'react';
import styles from './SkippedRowsBanner.module.css';

export default function SkippedRowsBanner({ skippedRows }) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed || !skippedRows || skippedRows.length === 0) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.header}>
        <span>
          {skippedRows.length} row{skippedRows.length > 1 ? 's were' : ' was'} skipped during import
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className={styles.toggle}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          <button
            className={styles.dismiss}
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <ul className={styles.list}>
          {skippedRows.map((row, i) => (
            <li key={i} className={styles.listItem}>
              <span className={styles.rowNum}>Row {row.rowNumber}</span>
              {row.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
