import styles from './SectionTree.module.css';

/**
 * Left navigation panel.
 * - Section names are inline editable inputs (spread-and-override keeps tempId).
 * - Items are clickable buttons that set the active selection.
 */
export default function SectionTree({
  tree,
  selectedSectionId,
  selectedItemId,
  onSelectItem,
  onSectionNameChange,
}) {
  return (
    <nav className={styles.tree}>
      {tree.map((section) => (
        <div key={section.tempId} className={styles.section}>
          <input
            className={styles.sectionNameInput}
            value={section.name}
            onChange={(e) => onSectionNameChange(section.tempId, e.target.value)}
            aria-label={`Section name: ${section.name}`}
          />
          {section.items.map((item) => (
            <button
              key={item.tempId}
              className={
                item.tempId === selectedItemId
                  ? `${styles.item} ${styles.itemActive}`
                  : styles.item
              }
              onClick={() => onSelectItem(section.tempId, item.tempId)}
            >
              {item.name}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
