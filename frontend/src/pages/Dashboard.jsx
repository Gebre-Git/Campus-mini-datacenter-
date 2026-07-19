import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMe, listFiles, logout } from '../services/api';
import QuotaBar from '../components/QuotaBar';
import FileList from '../components/FileList';
import UploadButton from '../components/UploadButton';

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
      if (err.message.includes('Session expired') || err.message.includes('Invalid token') || err.message.includes('Token expired')) {
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
      <div className="loading-page">
        <span className="spinner" />
        <span>Loading your files…</span>
      </div>
    );
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/dashboard" className="navbar-brand">
            <span className="logo-emoji">🏛️</span>
            Campus Mini-Cloud
          </Link>
          <div className="navbar-nav">
            <span className="navbar-user">
              Signed in as <strong>{user?.username}</strong>
              {user?.isAdmin && <span className="badge-admin">Admin</span>}
            </span>
            {user?.isAdmin && (
              <Link to="/admin" className="btn btn-secondary btn-sm">Admin Panel</Link>
            )}
            <button id="logout-button" className="btn btn-danger btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-page">
        <div className="dashboard-header">
          <h2>My Files</h2>
          <p>Your private, encrypted cloud storage</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Quota Card */}
        <div className="card">
          <div className="card-title">Storage Quota</div>
          <QuotaBar usedBytes={quota.usedBytes} quotaBytes={quota.quotaBytes} />
        </div>

        {/* Upload Card */}
        <div className="card">
          <div className="card-title">Upload</div>
          <UploadButton userQuota={quota} onUploadComplete={fetchData} />
        </div>

        {/* File List Card */}
        <div className="card">
          <div className="card-title">{files.length} file{files.length !== 1 ? 's' : ''}</div>
          <FileList files={files} onRefresh={fetchData} />
        </div>
      </div>
    </>
  );
}
