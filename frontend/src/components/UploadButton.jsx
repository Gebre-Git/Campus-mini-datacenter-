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
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function processSelectedFile(file) {
    if (!file) return;

    setError('');
    setProgress(0);

    // 1. Client-side check for 500 MB limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${formatBytes(file.size)}) exceeds maximum allowed limit of 500 MB.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // 2. Fetch user quota
    let usedBytes = userQuota?.usedBytes;
    let quotaBytes = userQuota?.quotaBytes;
    try {
      const me = await getMe();
      usedBytes = me.usedBytes;
      quotaBytes = me.quotaBytes;
    } catch {
      // Fallback
    }

    if (quotaBytes !== undefined && usedBytes !== undefined) {
      const remainingBytes = Number(quotaBytes) - Number(usedBytes);
      if (file.size > remainingBytes) {
        setError(
          `File size (${formatBytes(file.size)}) exceeds your remaining storage quota (${formatBytes(
            remainingBytes > 0 ? remainingBytes : 0
          )}).`
        );
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
    }

    // 3. Pre-flight check with backend
    try {
      const preCheck = await checkUpload(file.size);
      if (!preCheck.allowed) {
        setError(preCheck.error || 'Upload not allowed');
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
    } catch (checkErr) {
      setError(checkErr.message || 'Storage check failed before upload');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // 4. Start upload
    setUploading(true);

    try {
      await uploadFile(file, (pct) => setProgress(pct));
      onUploadComplete && onUploadComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    processSelectedFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
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

      <div
        className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current && inputRef.current.click()}
      >
        <div className="upload-icon">
          {uploading ? <span className="spinner" /> : '⇡'}
        </div>

        {uploading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
              Transmitting File Stream ({progress}%)
            </div>
            <div className="upload-progress-wrap" style={{ margin: '0.6rem auto 0 auto' }}>
              <div className="quota-track-bg">
                <div
                  className="quota-bar-fill"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: 'var(--state-success)',
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '1rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Drag & Drop files here
              </span>{' '}
              or <span style={{ color: 'var(--accent-lime)', textDecoration: 'underline', fontWeight: 600 }}>browse</span>
            </div>
            <div className="upload-hint-text mono-text">
              ENCRYPTED INGEST // MAX LIMIT: 500 MB
            </div>
            <button
              id="upload-button"
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.35rem' }}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current.click();
              }}
            >
              Select File to Upload
            </button>
          </>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: '0.85rem' }}>{error}</div>}
    </div>
  );
}
