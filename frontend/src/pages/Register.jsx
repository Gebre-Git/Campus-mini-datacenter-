import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, checkEmail } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import NodeGridCanvas from '../components/NodeGridCanvas';

export default function Register() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  async function handleVerifyEmail(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await checkEmail(trimmedEmail, trimmedCode);
      if (res.allowed) {
        setIsEmailVerified(true);
        if (res.bootstrap) {
          setSuccessMsg('SYSTEM UNLOCKED: Database bootstrap mode active.');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleResetEmail() {
    setIsEmailVerified(false);
    setError('');
    setSuccessMsg('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isEmailVerified) {
      setError('Please verify your email and code first');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), code.trim(), username.trim(), password);
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <NodeGridCanvas />

      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow-label">CAMPUS MINI-CLOUD // PROVISION ACCESS</span>
          <div style={{ margin: '1.1rem 0 0.6rem 0' }}>
            <BrandLogo size={44} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Create encrypted user account
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {!isEmailVerified ? (
          <form onSubmit={handleVerifyEmail} noValidate>
            <div className="form-group">
              <label htmlFor="reg-email">Campus Email</label>
              <input
                id="reg-email"
                className="form-input"
                type="email"
                placeholder="student@campus.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-code">5-Digit Verification Code</label>
              <input
                id="reg-code"
                className="form-input mono-text"
                type="text"
                maxLength={5}
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ letterSpacing: '0.15em', fontWeight: 600, fontSize: '1rem' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Issued by administrator (bypass for initial bootstrap user)
              </span>
            </div>

            <button
              id="verify-email-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.6rem' }}
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderColor: 'rgba(12, 16, 12, 0.3)', borderTopColor: '#0C100C' }} />
                  Verifying Authorization…
                </>
              ) : (
                'Verify Access Code'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="reg-email-verified">Campus Email</label>
                <button
                  type="button"
                  onClick={handleResetEmail}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-lime)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  Change Email
                </button>
              </div>
              <input
                id="reg-email-verified"
                className="form-input mono-text"
                type="email"
                value={email}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                className="form-input"
                type="text"
                placeholder="Choose username (3–32 chars)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                minLength={3}
                maxLength={32}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                className="form-input"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <input
                id="reg-confirm"
                className="form-input"
                type="password"
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.6rem' }}
              disabled={loading || !username || !password || !confirm}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderColor: 'rgba(12, 16, 12, 0.3)', borderTopColor: '#0C100C' }} />
                  Provisioning Account…
                </>
              ) : (
                'Create User Account'
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Already authorized?{' '}
          <Link to="/login" className="plain-link">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
