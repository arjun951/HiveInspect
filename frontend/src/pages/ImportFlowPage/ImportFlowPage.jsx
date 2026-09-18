import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadPage from '../UploadPage/UploadPage';
import ReviewPage from '../ReviewPage/ReviewPage';
import { decodeEntities } from '../../utils/decodeEntities';

/**
 * ImportFlowPage — manages the upload → review flow.
 *
 * Extracted from App.jsx so React Router can mount it at /import.
 * On success or cancel, navigates back to / (HomePage).
 */
export default function ImportFlowPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState('upload'); // 'upload' | 'review'
  const [fileName, setFileName] = useState('');
  const [tree, setTree] = useState([]);
  const [unsupportedColumns, setUnsupportedColumns] = useState([]);
  const [skippedRows, setSkippedRows] = useState([]);

  function decodeTree(rawTree) {
    return rawTree.map((s) => ({
      ...s,
      name: decodeEntities(s.name),
      items: s.items.map((it) => ({
        ...it,
        name: decodeEntities(it.name),
        comments: it.comments.map((c) => ({
          ...c,
          name: decodeEntities(c.name),
          comment_text: decodeEntities(c.comment_text),
        })),
      })),
    }));
  }

  function handleParsed(parseResult, name) {
    // Deep-clone then decode HTML entities so &amp; → & everywhere
    setTree(decodeTree(JSON.parse(JSON.stringify(parseResult.tree))));
    setUnsupportedColumns(parseResult.unsupportedColumns ?? []);
    setSkippedRows(parseResult.skippedRows ?? []);
    setFileName(name);
    setScreen('review');
  }

  function handleStartOver() {
    navigate('/');
  }

  if (screen === 'review') {
    return (
      <ReviewPage
        fileName={fileName}
        tree={tree}
        setTree={setTree}
        unsupportedColumns={unsupportedColumns}
        skippedRows={skippedRows}
        onStartOver={handleStartOver}
      />
    );
  }

  return <UploadPage onParsed={handleParsed} />;
}
