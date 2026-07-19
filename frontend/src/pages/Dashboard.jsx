import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMe, listFiles, logout } from '../services/api';
import QuotaBar from '../components/QuotaBar';
import FileList from '../components/FileList';
import UploadButton from '../components/UploadButton';
import BrandLogo from '../components/BrandLogo';

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [quota, setQuota] = useState({ usedBytes: user?.usedBytes || 0, quotaBytes: user?.quotaBytes || 524288000 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [meData, filesData] = await Promise.all([getMe(), listFiles()]);
      setQuota({ usedBytes: meData.usedBytes, quotaBytes: meData.quotaBytes });
      setFiles(filesData);
    } catch (err) {
      if (
        err.message.includes('Session expired') ||
        err.message.includes('Invalid token') ||
        err.message.includes('Token expired')
      ) {
        handleLogout();
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleLogout() {
    await logout();
    onLogout();
    navigate('/login');
  }

  if (loading) {
    return (
      <div className="page-loading">
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <span>INITIALIZING SYSTEM SESSION…</span>
      </div>
    );
  }

  return (
    <>
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link to="/dashboard" className="navbar-brand-link">
              <BrandLogo size={36} />
            </Link>
          </div>

          <div className="navbar-nav" style={{ gap: '2.5rem' }}>
            <span className="navbar-user-text">
              OPERATOR <strong>{user?.username}</strong>
              {user?.isAdmin && <span className="badge-admin">Admin</span>}
            </span>

            {user?.isAdmin && (
              <Link to="/admin" className="btn btn-secondary btn-sm">
                System Admin
              </Link>
            )}

            <button id="logout-button" className="btn btn-danger btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Page Content */}
      <div className="page-container">
        <div>
          <h1>Storage Control Room</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Quota Section */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="eyebrow-label">STORAGE QUOTA ENFORCEMENT</span>
          </div>
          <QuotaBar usedBytes={quota.usedBytes} quotaBytes={quota.quotaBytes} />
        </div>

        {/* Upload Section */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="eyebrow-label">FILE INGESTION & ENCRYPTION</span>
          </div>
          <UploadButton userQuota={quota} onUploadComplete={fetchData} />
        </div>

        {/* Stored Files Section */}
        <div className="panel-card">
          <div className="panel-header">
            <span className="eyebrow-label">STORED ENCRYPTED OBJECTS ({files.length})</span>
          </div>
          <FileList files={files} onRefresh={fetchData} />
        </div>
      </div>
    </>
  );
}
