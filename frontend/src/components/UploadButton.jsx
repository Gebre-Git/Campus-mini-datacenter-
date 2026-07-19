import React, { useRef, useState } from 'react';
import { uploadFile } from '../services/api';

export default function UploadButton({ onUploadComplete }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      await uploadFile(file, (pct) => setProgress(pct));
      onUploadComplete && onUploadComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset so same file can be re-uploaded
      inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        id="file-upload-input"
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={uploading}
      />
      <div className="upload-area">
        <button
          id="upload-button"
          className="btn btn-primary"
          style={{ width: 'auto' }}
          onClick={() => inputRef.current.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner" />
              Uploading {progress > 0 ? `${progress}%` : ''}
            </>
          ) : (
            <>📤 Upload File</>
          )}
        </button>
        {!uploading && (
          <span className="upload-hint">Max 100 MB per file</span>
        )}
        {uploading && progress > 0 && (
          <div style={{ flex: 1, maxWidth: 200 }}>
            <div className="quota-track">
              <div
                className="quota-fill"
                style={{ width: `${progress}%`, background: 'var(--success)', transition: 'width 0.1s' }}
              />
            </div>
          </div>
        )}
      </div>
      {error && <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>}
    </div>
  );
}
