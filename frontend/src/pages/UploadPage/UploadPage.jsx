import { useState, useRef } from 'react';
import { parseFile } from '../../api/importApi';
import styles from './UploadPage.module.css';

export default function UploadPage({ onParsed }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const chosen = e.target.files[0] || null;
    setFile(chosen);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const result = await parseFile(file);
      onParsed(result, file.name);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div>
          <h1 className={styles.title}>Hive Import</h1>
          <p className={styles.subtitle}>Upload an .xlsx or .xls inspection template to review before saving.</p>
        </div>

        <label className={styles.fileLabel}>
          Choose file
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className={styles.fileInput}
            onChange={handleFileChange}
            disabled={loading}
          />
        </label>

        {file && !loading && (
          <p className={styles.fileName}>{file.name}</p>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!file || loading}
        >
          {loading ? 'Parsing…' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
