import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminGetFiles, adminGetUsers, logout, adminGetAllowedEmails, adminAddAllowedEmail, adminDeleteAllowedEmail } from '../services/api';

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
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    async function fetchAll() {
      try {
        const [f, u, e] = await Promise.all([
          adminGetFiles(),
          adminGetUsers(),
          adminGetAllowedEmails()
        ]);
        setFiles(f);
        setUsers(u);
        setAllowedEmails(e);
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

  async function handleAddEmail(e) {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    const emailToSubmit = newEmail.trim();

    if (!emailToSubmit || !emailToSubmit.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setActionLoading(true);
    try {
      const created = await adminAddAllowedEmail(emailToSubmit);
      setAllowedEmails((prev) => [created, ...prev]);
      setNewEmail('');
      setEmailSuccess(`Email added! 5-Digit Verification Code: ${created.code}`);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteEmail(id) {
    if (!window.confirm('Are you sure you want to remove this email?')) {
      return;
    }
    setEmailError('');
    setEmailSuccess('');
    try {
      await adminDeleteAllowedEmail(id);
      setAllowedEmails((prev) => prev.filter((item) => item.id !== id));
      setEmailSuccess('Email removed successfully.');
    } catch (err) {
      setEmailError(err.message);
    }
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
            { label: 'Allowed Emails', value: allowedEmails.length },
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

          {/* Allowed Emails Section */}
          <div className="card">
            <div className="section-title">✉️ Allowed Emails ({allowedEmails.length})</div>
            
            {emailError && <div className="alert alert-error">{emailError}</div>}
            {emailSuccess && <div className="alert alert-success">{emailSuccess}</div>}

            <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                id="allowed-email-input"
                type="email"
                placeholder="student@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                id="add-email-button"
                type="submit"
                className="btn btn-primary"
                style={{ width: 'auto', padding: '0.5rem 1rem' }}
                disabled={actionLoading || !newEmail}
              >
                {actionLoading ? 'Adding…' : 'Add Email'}
              </button>
            </form>

            {allowedEmails.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No allowed emails yet.</p>
            ) : (
              <div className="file-table-wrap" style={{ maxHeight: 350, overflowY: 'auto' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Email Address</th>
                      <th>5-Digit Code</th>
                      <th>Added On</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowedEmails.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.email}</td>
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '1rem',
                            fontWeight: 700,
                            letterSpacing: '0.1rem',
                            color: 'var(--accent)',
                            background: 'rgba(99, 102, 241, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }}>
                            {item.code}
                          </span>
                        </td>
                        <td className="file-date">{formatDate(item.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteEmail(item.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Files card (full-width below grid) */}
        <div className="card" style={{ marginTop: '2rem' }}>
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
    </>
  );
}
