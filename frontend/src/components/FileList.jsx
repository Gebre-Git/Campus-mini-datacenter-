import React, { useState } from 'react';
import { downloadFile, deleteFile } from '../services/api';

function formatBytes(bytes) {
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
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
        <div className="empty-icon">📂</div>
        <p>No files yet. Upload your first file above.</p>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="file-table-wrap">
        <table className="file-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id}>
                <td>
                  <span className="file-name" title={file.filename}>
                    {file.filename}
                  </span>
                </td>
                <td className="file-size">{formatBytes(file.sizeBytes)}</td>
                <td className="file-date">{formatDate(file.uploadedAt)}</td>
                <td>
                  <div className="actions-cell">
                    <button
                      id={`download-${file.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id || deleting === file.id}
                    >
                      {downloading === file.id ? <span className="spinner" /> : '⬇ Download'}
                    </button>
                    <button
                      id={`delete-${file.id}`}
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(file)}
                      disabled={downloading === file.id || deleting === file.id}
                    >
                      {deleting === file.id ? <span className="spinner" /> : '🗑 Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
