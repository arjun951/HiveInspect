import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionTree from '../../components/SectionTree/SectionTree';
import CommentPanel from '../../components/CommentPanel/CommentPanel';
import SkippedRowsBanner from '../../components/SkippedRowsBanner/SkippedRowsBanner';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import styles from './ReviewPage.module.css';

/**
 * Review screen — two-panel layout.
 *
 * All tree edits use spread-and-override to preserve every node's tempId.
 * tempId must survive every edit because the confirm endpoint's invalidComments
 * error response identifies failing comments by tempId.
 */
export default function ReviewPage({
  fileName,
  tree,
  setTree,
  unsupportedColumns,
  skippedRows,
  onStartOver,
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(
    tree[0]?.tempId ?? null,
  );
  const [selectedItemId, setSelectedItemId] = useState(
    tree[0]?.items[0]?.tempId ?? null,
  );
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [invalidCommentMap, setInvalidCommentMap] = useState(null); // Map<tempId, reason>
  const [invalidBannerVisible, setInvalidBannerVisible] = useState(false);

  // Count total comments across the whole tree
  const totalComments = tree.reduce(
    (acc, s) => acc + s.items.reduce((a, it) => a + it.comments.length, 0),
    0,
  );

  // Derive the currently selected item from tree state
  const selectedItem = tree
    .find((s) => s.tempId === selectedSectionId)
    ?.items.find((it) => it.tempId === selectedItemId) ?? null;

  // ── Tree edit handlers (spread-and-override — never rebuild from scratch) ──

  const handleSectionNameChange = useCallback((sectionTempId, newName) => {
    setTree((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId ? { ...s, name: newName } : s,
      ),
    );
  }, [setTree]);

  const handleSelectItem = useCallback((sectionTempId, itemTempId) => {
    setSelectedSectionId(sectionTempId);
    setSelectedItemId(itemTempId);
  }, []);

  const handleItemNameChange = useCallback((newName) => {
    setTree((prev) =>
      prev.map((s) => ({
        ...s,
        items: s.items.map((it) =>
          it.tempId === selectedItemId ? { ...it, name: newName } : it,
        ),
      })),
    );
  }, [setTree, selectedItemId]);

  const handleCommentChange = useCallback((commentTempId, field, value) => {
    setTree((prev) =>
      prev.map((s) => ({
        ...s,
        items: s.items.map((it) => ({
          ...it,
          comments: it.comments.map((c) =>
            c.tempId === commentTempId
              ? { ...c, [field]: value } // spread preserves tempId and all other fields
              : c,
          ),
        })),
      })),
    );
  }, [setTree]);

  // ── Confirm modal callbacks ──

  function handleInvalidComments(map) {
    setInvalidCommentMap(map);
    setInvalidBannerVisible(true);
    setShowModal(false);
  }

  function handleSuccess(_templateId) {
    // Navigate to home — the template list re-fetches automatically
    navigate('/');
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.headerTitle}>Review import</span>
        <span className={styles.headerMeta}>
          {fileName} · {totalComments} comment{totalComments !== 1 ? 's' : ''} parsed
        </span>
        <button className={styles.confirmBtn} onClick={() => setShowModal(true)}>
          Confirm import
        </button>
      </header>

      {/* Banners */}
      <div className={styles.banners}>
        <SkippedRowsBanner skippedRows={skippedRows} />
        {invalidBannerVisible && invalidCommentMap && (
          <div className={styles.invalidBanner}>
            {invalidCommentMap.size} comment{invalidCommentMap.size > 1 ? 's' : ''} failed
            re-validation — they are highlighted below. Please fix and try again.
          </div>
        )}
      </div>

      {/* Two-panel body */}
      <div className={styles.body}>
        <SectionTree
          tree={tree}
          selectedSectionId={selectedSectionId}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
          onSectionNameChange={handleSectionNameChange}
        />
        <CommentPanel
          item={selectedItem}
          unsupportedColumns={unsupportedColumns}
          invalidCommentMap={invalidCommentMap}
          onItemNameChange={handleItemNameChange}
          onCommentChange={handleCommentChange}
        />
      </div>

      {showModal && (
        <ConfirmModal
          tree={tree}
          unsupportedColumns={unsupportedColumns}
          onCancel={() => setShowModal(false)}
          onSuccess={handleSuccess}
          onInvalidComments={handleInvalidComments}
        />
      )}
    </div>
  );
}
