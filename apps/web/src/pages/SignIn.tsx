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

export default function SignIn() {
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
          Secure your
          <br />
          <span className="auth-brand-title-accent">supply chain</span>
        </h2>

        <p className="auth-brand-sub">
          Detect vulnerabilities in your dependencies before they reach production.
          TraceLock gives your team real-time risk intelligence.
        </p>

        <div className="auth-brand-features">
          <div className="auth-brand-feature">
            <span className="auth-brand-feature-icon"><CheckIcon /></span>
            Automated vulnerability scanning
          </div>
          <div className="auth-brand-feature">
            <span className="auth-brand-feature-icon"><CheckIcon /></span>
            Attack path propagation analysis
          </div>
          <div className="auth-brand-feature">
            <span className="auth-brand-feature-icon"><CheckIcon /></span>
            SBOM export (CycloneDX &amp; SPDX)
          </div>
        </div>
      </div>

      {/* ── Form panel ───────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Welcome back</h1>
            <p className="auth-form-subtitle">
              Don&apos;t have an account?{' '}
              <Link to="/signup">Sign up</Link>
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signin-email">Email address</label>
              <input
                id="signin-email"
                className="auth-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-form-row">
                <label className="auth-label" htmlFor="signin-password">Password</label>
                <Link to="/forgot-password" className="auth-form-link">
                  Forgot password?
                </Link>
              </div>
              <input
                id="signin-password"
                className="auth-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="auth-submit">
              Sign in
            </button>
          </form>

          <p className="auth-footer-text">
            By signing in, you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
