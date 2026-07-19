import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, checkEmail } from '../services/api';

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
          setSuccessMsg('First user signup: registration is unlocked for database bootstrap.');
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
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🏛️</div>
          <h1>Campus Mini-Cloud</h1>
          <p>Create your account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {!isEmailVerified ? (
          <form onSubmit={handleVerifyEmail} noValidate>
            <div className="form-group">
              <label htmlFor="reg-email">School Email</label>
              <input
                id="reg-email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-code">5-Digit Verification Code</label>
              <input
                id="reg-code"
                type="text"
                maxLength={5}
                placeholder="e.g. 12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ letterSpacing: '0.1rem', fontWeight: 600 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ask your admin for your 5-digit access code (not required for bootstrap user)
              </span>
            </div>
            <button
              id="verify-email-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !email}
            >
              {loading ? <><span className="spinner" /> Verifying…</> : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {successMsg && <div className="alert alert-success">{successMsg}</div>}
            
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="reg-email-verified" style={{ margin: 0 }}>School Email</label>
                <button
                  type="button"
                  onClick={handleResetEmail}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Change
                </button>
              </div>
              <input
                id="reg-email-verified"
                type="email"
                value={email}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                placeholder="Choose a username (3–32 chars)"
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
                type="password"
                placeholder="Re-enter your password"
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
              disabled={loading || !username || !password || !confirm}
            >
              {loading ? <><span className="spinner" /> Creating account…</> : 'Create Account'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
