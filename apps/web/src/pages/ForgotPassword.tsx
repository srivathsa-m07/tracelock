import { useState } from 'react';
import { Link } from 'react-router-dom';
import './auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI-only — no backend integration yet
    setSubmitted(true);
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
          Account
          <br />
          <span className="auth-brand-title-accent">recovery</span>
        </h2>

        <p className="auth-brand-sub">
          Enter the email address associated with your account and we&apos;ll send
          you instructions to reset your password.
        </p>
      </div>

      {/* ── Form panel ───────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <Link to="/signin" className="auth-back-link">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to sign in
          </Link>

          <div className="auth-form-header">
            <h1 className="auth-form-title">Reset password</h1>
            <p className="auth-form-subtitle">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {submitted ? (
            <div className="auth-success">
              If an account exists for <strong>{email}</strong>, you&apos;ll receive
              password reset instructions shortly. Check your inbox and spam folder.
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email"
                  className="auth-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <button type="submit" className="auth-submit">
                Send reset link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
