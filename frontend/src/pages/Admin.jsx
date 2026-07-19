import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  adminGetFiles,
  adminGetUsers,
  logout,
  adminGetAllowedEmails,
  adminAddAllowedEmail,
  adminDeleteAllowedEmail,
  adminRegenerateAllowedEmail,
} from '../services/api';
import BrandLogo from '../components/BrandLogo';

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

function formatRemainingTime(expiresAtStr) {
  if (!expiresAtStr) return 'No Expiry';
  const diffMs = new Date(expiresAtStr) - new Date();
  if (diffMs <= 0) return 'Expired';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
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
          adminGetAllowedEmails(),
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
      setEmailSuccess(`Access Code Generated: ${created.code} (Valid for 24 hours)`);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRegenerateCode(id) {
    setEmailError('');
    setEmailSuccess('');
    try {
      const updated = await adminRegenerateAllowedEmail(id);
      setAllowedEmails((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setEmailSuccess(`New code generated: ${updated.code} (24h validity restored)`);
    } catch (err) {
      setEmailError(err.message);
    }
  }

  async function handleDeleteEmail(id) {
    if (!window.confirm('Revoke access authorization for this email?')) {
      return;
    }
    setEmailError('');
    setEmailSuccess('');
    try {
      await adminDeleteAllowedEmail(id);
      setAllowedEmails((prev) => prev.filter((item) => item.id !== id));
      setEmailSuccess('Email authorization revoked.');
    } catch (err) {
      setEmailError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <span>LOADING INFRASTRUCTURE TELEMETRY…</span>
      </div>
    );
  }

  const totalStorage = users.reduce((sum, u) => sum + Number(u.usedBytes), 0);

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link to="/dashboard" className="navbar-brand-link">
              <BrandLogo size={36} />
            </Link>
            <div className="navbar-status">
              <span className="status-dot" />
              <span>ADMIN MODE</span>
            </div>
          </div>

          <div className="navbar-nav">
            <span className="navbar-user-text">
              OPERATOR <strong>{user?.username}</strong>
              <span className="badge-admin">Admin</span>
            </span>

            <Link to="/dashboard" className="btn btn-secondary btn-sm">
              User Dashboard
            </Link>

            <button id="admin-logout-button" className="btn btn-danger btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Admin Content */}
      <div className="page-container">
        <div>
          <span className="eyebrow-label">CAMPUS MINI-CLOUD // INFRASTRUCTURE MANAGEMENT</span>
          <h1 style={{ marginTop: '0.35rem' }}>System Control Panel</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Telemetry Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="eyebrow-label">REGISTERED USERS</span>
            <div className="stat-value">{users.length}</div>
          </div>

          <div className="stat-card">
            <span className="eyebrow-label">AUTHORIZED EMAILS</span>
            <div className="stat-value">{allowedEmails.length}</div>
          </div>

          <div className="stat-card">
            <span className="eyebrow-label">TOTAL OBJECTS</span>
            <div className="stat-value">{files.length}</div>
          </div>

          <div className="stat-card">
            <span className="eyebrow-label">STORAGE CONSUMED</span>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>
              {formatBytes(totalStorage)}
            </div>
          </div>
        </div>

        {/* System Administration Sections */}
        <div className="admin-sections-grid">
          {/* User Accounts Panel */}
          <div className="panel-card">
            <div className="panel-header">
              <span className="eyebrow-label">ALL USERS ({users.length})</span>
            </div>

            {users.length === 0 ? (
              <div className="empty-state">NO USER ACCOUNTS REGISTERED</div>
            ) : (
              <div className="responsive-table-wrap" style={{ maxHeight: 380, overflowY: 'auto' }}>
                <table className="data-table data-table-responsive">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Used / Quota</th>
                      <th>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const pct =
                        Number(u.quotaBytes) > 0
                          ? Math.min(100, (Number(u.usedBytes) / Number(u.quotaBytes)) * 100)
                          : 0;
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600, fontSize: '1rem' }}>{u.username}</td>
                          <td>
                            {u.isAdmin ? (
                              <span className="badge-admin">Admin</span>
                            ) : (
                              <span className="cell-mono">User</span>
                            )}
                          </td>
                          <td className="cell-mono">
                            <div>
                              {formatBytes(u.usedBytes)} / {formatBytes(u.quotaBytes)}
                            </div>
                            <div className="quota-track-bg" style={{ marginTop: 5, height: 6 }}>
                              <div
                                className="quota-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: pct > 90 ? 'var(--state-danger)' : 'var(--accent-lime)',
                                }}
                              />
                            </div>
                          </td>
                          <td className="cell-mono">{u.fileCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Authorized Emails Panel */}
          <div className="panel-card">
            <div className="panel-header">
              <span className="eyebrow-label">AUTHORIZED EMAILS ({allowedEmails.length})</span>
            </div>

            {emailError && <div className="alert alert-error">{emailError}</div>}
            {emailSuccess && <div className="alert alert-success">{emailSuccess}</div>}

            <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <input
                id="allowed-email-input"
                className="form-input"
                type="email"
                placeholder="student@campus.edu"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <button
                id="add-email-button"
                type="submit"
                className="btn btn-primary"
                disabled={actionLoading || !newEmail}
              >
                {actionLoading ? 'Provisioning…' : 'Authorize Email'}
              </button>
            </form>

            {allowedEmails.length === 0 ? (
              <div className="empty-state">NO AUTHORIZED EMAILS FOUND</div>
            ) : (
              <div className="responsive-table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="data-table data-table-responsive">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Expires</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowedEmails.map((item) => {
                      const now = new Date();
                      const isBlocked = item.blockedUntil && now < new Date(item.blockedUntil);
                      const isExpired = item.expiresAt && now > new Date(item.expiresAt);
                      const blockMinsLeft = isBlocked
                        ? Math.ceil((new Date(item.blockedUntil) - now) / 60000)
                        : 0;

                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.email}</td>
                          <td>
                            <span
                              className="cell-mono"
                              style={{
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                color: isBlocked || isExpired ? 'var(--text-muted)' : 'var(--accent-lime)',
                                backgroundColor: 'var(--accent-lime-alpha)',
                                padding: '3px 8px',
                                borderRadius: '3px',
                                textDecoration: isExpired ? 'line-through' : 'none',
                              }}
                            >
                              {item.code}
                            </span>
                          </td>
                          <td>
                            {isBlocked ? (
                              <span
                                style={{
                                  backgroundColor: 'var(--state-danger-alpha)',
                                  color: 'var(--state-danger)',
                                  padding: '3px 8px',
                                  borderRadius: '3px',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                BLOCKED ({blockMinsLeft}m)
                              </span>
                            ) : isExpired ? (
                              <span
                                style={{
                                  backgroundColor: 'rgba(232, 96, 74, 0.15)',
                                  color: 'var(--state-danger)',
                                  padding: '3px 8px',
                                  borderRadius: '3px',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                EXPIRED
                              </span>
                            ) : (
                              <span
                                style={{
                                  backgroundColor: 'var(--state-success-alpha)',
                                  color: 'var(--state-success)',
                                  padding: '3px 8px',
                                  borderRadius: '3px',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="cell-mono">{formatRemainingTime(item.expiresAt)}</td>
                          <td className="cell-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Regenerate code"
                              onClick={() => handleRegenerateCode(item.id)}
                            >
                              New Code
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              title="Revoke access"
                              onClick={() => handleDeleteEmail(item.id)}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Global Files Inventory Panel */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="eyebrow-label">ALL STORED OBJECTS ({files.length})</span>
          </div>

          {files.length === 0 ? (
            <div className="empty-state">NO ENCRYPTED FILES IN SYSTEM INVENTORY</div>
          ) : (
            <div className="responsive-table-wrap" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="data-table data-table-responsive">
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
                      <td style={{ fontWeight: 600, fontSize: '1rem' }} title={f.filename}>
                        {f.filename}
                      </td>
                      <td className="cell-mono" style={{ color: 'var(--accent-lime)' }}>
                        {f.username}
                      </td>
                      <td className="cell-mono">{formatBytes(f.sizeBytes)}</td>
                      <td className="cell-mono">{formatDate(f.uploadedAt)}</td>
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
