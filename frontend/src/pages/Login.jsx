import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import NodeGridCanvas from '../components/NodeGridCanvas';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      // Trigger handshake lime-green flash success moment
      setIsSuccess(true);
      setTimeout(() => {
        onLogin(data);
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // Check for success message from register redirect
  const params = new URLSearchParams(window.location.search);
  const registered = params.get('registered');

  return (
    <div className="auth-page">
      <NodeGridCanvas isSuccess={isSuccess} />

      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow-label">CAMPUS MINI-CLOUD // SECURE ACCESS</span>
          <div style={{ margin: '1.1rem 0 0.6rem 0' }}>
            <BrandLogo size={44} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Encrypted infrastructure storage
          </p>
        </div>

        {registered && (
          <div className="alert alert-success">
            SUCCESS: Account created. Enter credentials to connect.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className="form-input"
              type="text"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.6rem' }}
            disabled={loading || !username || !password}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ borderColor: 'rgba(12, 16, 12, 0.3)', borderTopColor: '#0C100C' }} />
                Establishing Session…
              </>
            ) : (
              'Authenticate Session'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Need access code?{' '}
          <Link to="/register" className="plain-link">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
}
