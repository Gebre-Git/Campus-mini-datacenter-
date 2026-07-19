import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminGetFiles, adminGetUsers, logout } from '../services/api';

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

export default function Admin({ user, onLogout }) {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    async function fetchAll() {
      try {
        const [f, u] = await Promise.all([adminGetFiles(), adminGetUsers()]);
        setFiles(f);
        setUsers(u);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [user, navigate]);

  async function handleLogout() {
    await logout();
    onLogout();
    navigate('/login');
  }

  if (loading) {
    return (
      <div className="loading-page">
        <span className="spinner" />
        <span>Loading admin data…</span>
      </div>
    );
  }

  const totalStorage = users.reduce((sum, u) => sum + Number(u.usedBytes), 0);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/dashboard" className="navbar-brand">
            <span className="logo-emoji">🏛️</span>
            Campus Mini-Cloud
          </Link>
          <div className="navbar-nav">
            <span className="navbar-user">
              <strong>{user?.username}</strong>
              <span className="badge-admin">Admin</span>
            </span>
            <Link to="/dashboard" className="btn btn-secondary btn-sm">My Files</Link>
            <button id="admin-logout-button" className="btn btn-danger btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="admin-page">
        <h2>🛡 Admin Panel</h2>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Users', value: users.length },
            { label: 'Total Files', value: files.length },
            { label: 'Total Storage Used', value: formatBytes(totalStorage) },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ flex: '1 1 180px', minWidth: 160 }}>
              <div className="card-title">{stat.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="admin-grid">
          {/* Users table */}
          <div className="card">
            <div className="section-title">👥 Users ({users.length})</div>
            {users.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No users yet.</p>
            ) : (
              <div className="file-table-wrap">
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Used / Quota</th>
                      <th>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const pct = Number(u.quotaBytes) > 0
                        ? Math.min(100, (Number(u.usedBytes) / Number(u.quotaBytes)) * 100)
                        : 0;
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 500 }}>{u.username}</td>
                          <td>
                            {u.isAdmin
                              ? <span className="badge-admin">Admin</span>
                              : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>User</span>}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {formatBytes(u.usedBytes)} / {formatBytes(u.quotaBytes)}
                            </div>
                            <div className="quota-track" style={{ marginTop: 4, height: 4 }}>
                              <div
                                className="quota-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--accent)',
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{u.fileCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Files table */}
          <div className="card">
            <div className="section-title">📁 All Files ({files.length})</div>
            {files.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No files uploaded yet.</p>
            ) : (
              <div className="file-table-wrap" style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Owner</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}>
                        <td className="file-name" title={f.filename}>{f.filename}</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 500 }}>{f.username}</td>
                        <td className="file-size">{formatBytes(f.sizeBytes)}</td>
                        <td className="file-date">{formatDate(f.uploadedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
