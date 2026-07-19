import React, { useRef, useState } from 'react';
import { uploadFile, checkUpload, getMe } from '../services/api';

function formatBytes(bytes) {
  const b = Number(bytes);
  if (isNaN(b) || b < 0) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export default function UploadButton({ userQuota, onUploadComplete }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setProgress(0);

    // 1. Immediate client-side check for 500 MB max file limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${formatBytes(file.size)}) exceeds maximum allowed limit of 500 MB.`);
      inputRef.current.value = '';
      return;
    }

    // 2. Fetch fresh user quota to check remaining storage
    let usedBytes = userQuota?.usedBytes;
    let quotaBytes = userQuota?.quotaBytes;
    try {
      const me = await getMe();
      usedBytes = me.usedBytes;
      quotaBytes = me.quotaBytes;
    } catch {
      // Ignore error if getMe fails, fallback to prop
    }

    if (quotaBytes !== undefined && usedBytes !== undefined) {
      const remainingBytes = Number(quotaBytes) - Number(usedBytes);
      if (file.size > remainingBytes) {
        setError(
          `File size (${formatBytes(file.size)}) exceeds your remaining storage quota (${formatBytes(remainingBytes > 0 ? remainingBytes : 0)}).`
        );
        inputRef.current.value = '';
        return;
      }
    }

    // 3. Pre-flight check with backend (so server rejects before payload transmission)
    try {
      const preCheck = await checkUpload(file.size);
      if (!preCheck.allowed) {
        setError(preCheck.error || 'Upload not allowed');
        inputRef.current.value = '';
        return;
      }
    } catch (checkErr) {
      setError(checkErr.message || 'Storage check failed before upload');
      inputRef.current.value = '';
      return;
    }

    // 4. Start actual upload
    setUploading(true);

    try {
      await uploadFile(file, (pct) => setProgress(pct));
      onUploadComplete && onUploadComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
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
          <span className="upload-hint">Max 500 MB per file</span>
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
