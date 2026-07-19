import React, { useState } from 'react';
import { downloadFile, deleteFile } from '../services/api';

function formatBytes(bytes) {
  const b = Number(bytes);
  if (isNaN(b) || b < 0) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FileList({ files, onRefresh }) {
  const [downloading, setDownloading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

  async function handleDownload(file) {
    setDownloading(file.id);
    setError('');
    try {
      await downloadFile(file.id, file.filename);
    } catch (err) {
      setError(`Download failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`Delete "${file.filename}"? This cannot be undone.`)) return;
    setDeleting(file.id);
    setError('');
    try {
      await deleteFile(file.id);
      onRefresh && onRefresh();
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  }

  if (!files || files.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>∅</div>
        <p style={{ fontSize: '0.95rem', letterSpacing: '0.05em' }}>NO STORED FILES FOUND</p>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      
      <div className="responsive-table-wrap">
        <table className="data-table data-table-responsive">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th>Timestamp</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id}>
                <td>
                  <div
                    style={{
                      fontWeight: 600,
                      wordBreak: 'break-all',
                      color: 'var(--text-primary)',
                      fontSize: '1rem', /* 16px minimum */
                    }}
                    title={file.filename}
                  >
                    {file.filename}
                  </div>
                </td>
                <td className="cell-mono">{formatBytes(file.sizeBytes)}</td>
                <td className="cell-mono">{formatDate(file.uploadedAt)}</td>
                <td className="cell-actions" style={{ justifyContent: 'flex-end' }}>
                  <button
                    id={`download-${file.id}`}
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDownload(file)}
                    disabled={downloading === file.id || deleting === file.id}
                    title="Download file"
                  >
                    {downloading === file.id ? (
                      <span className="spinner" />
                    ) : (
                      <>
                        <span>⬇</span> Download
                      </>
                    )}
                  </button>
                  <button
                    id={`delete-${file.id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(file)}
                    disabled={downloading === file.id || deleting === file.id}
                    title="Delete file"
                  >
                    {deleting === file.id ? (
                      <span className="spinner" />
                    ) : (
                      <>
                        <span>🗑</span> Delete
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
