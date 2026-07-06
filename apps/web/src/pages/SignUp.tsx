import { useState } from 'react';
import { Link } from 'react-router-dom';
import './auth.css';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI-only — no backend integration yet
  };

  return (
    <div className="auth-page">
      {/* ── Brand panel ──────────────────────────────────── */}
      <div className="auth-brand">
        <Link to="/" className="auth-brand-logo">
          <span className="auth-brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L4 5.5V10C4 14.5 7 18.2 11 19.5C15 18.2 18 14.5 18 10V5.5L11 2Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
                fill="currentColor" fillOpacity="0.15" />
              <path d="M8 11L10 13L14 9" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="auth-brand-logo-name">TraceLock</span>
        </Link>

        <h2 className="auth-brand-title">
          Start securing
          <br />
          <span className="auth-brand-title-accent">in minutes</span>
        </h2>

        <p className="auth-brand-sub">
          Join engineering and security teams who use TraceLock to detect and
          remediate dependency vulnerabilities before they ship.
        </p>

        <div className="auth-brand-features">
          <div className="auth-brand-feature">
            <span className="auth-brand-feature-icon"><CheckIcon /></span>
            No credit card required
          </div>
          <div className="auth-brand-feature">
            <span className="auth-brand-feature-icon"><CheckIcon /></span>
            First scan in under 30 seconds
          </div>
          <div className="auth-brand-feature">
            <span className="auth-brand-feature-icon"><CheckIcon /></span>
            Full risk intelligence dashboard
          </div>
        </div>
      </div>

      {/* ── Form panel ───────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Create your account</h1>
            <p className="auth-form-subtitle">
              Already have an account?{' '}
              <Link to="/signin">Sign in</Link>
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                className="auth-input"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-email">Work email</label>
              <input
                id="signup-email"
                className="auth-input"
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                className="auth-input"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="auth-submit">
              Create account
            </button>
          </form>

          <p className="auth-footer-text">
            By creating an account, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
