import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import UploadModal from './UploadModal';
import Toast from '../ui/Toast';
import type { ToastType } from '../ui/Toast';

import './shell.css';

/* ── Route metadata ─────────────────────────────────────────────── */
const ROUTE_META: Array<{
  pattern: RegExp;
  crumbs: (m: RegExpMatchArray) => Array<{ label: string; href?: string }>;
}> = [
  {
    pattern: /^\/scans\/([^/]+)\/propagation$/,
    crumbs: (m) => [
      { label: 'Scans', href: '/scans' },
      { label: `Scan ${m[1].slice(-8)}`, href: `/scans/${m[1]}` },
      { label: 'Attack Paths' },
    ],
  },
  {
    pattern: /^\/scans\/([^/]+)\/dependency-tree$/,
    crumbs: (m) => [
      { label: 'Scans', href: '/scans' },
      { label: `Scan ${m[1].slice(-8)}`, href: `/scans/${m[1]}` },
      { label: 'Dependency Tree' },
    ],
  },
  {
    pattern: /^\/scans\/([^/]+)\/graph$/,
    crumbs: (m) => [
      { label: 'Scans', href: '/scans' },
      { label: `Scan ${m[1].slice(-8)}`, href: `/scans/${m[1]}` },
      { label: 'Graph' },
    ],
  },
  {
    pattern: /^\/scans\/([^/]+)\/risk-summary$/,
    crumbs: (m) => [
      { label: 'Scans', href: '/scans' },
      { label: `Scan ${m[1].slice(-8)}`, href: `/scans/${m[1]}` },
      { label: 'Risk Summary' },
    ],
  },
  {
    pattern: /^\/scans\/([^/]+)$/,
    crumbs: (m) => [
      { label: 'Scans', href: '/scans' },
      { label: `Scan ${m[1].slice(-8)}` },
    ],
  },
  { pattern: /^\/scans$/, crumbs: () => [{ label: 'Scans' }] },
  { pattern: /^\/dashboard$/, crumbs: () => [{ label: 'Overview' }] },
  { pattern: /^\/executive$/, crumbs: () => [{ label: 'Insights' }] },
  { pattern: /^\/organization$/, crumbs: () => [{ label: 'Repositories' }] },
];

function useBreadcrumbs(pathname: string) {
  for (const route of ROUTE_META) {
    const match = pathname.match(route.pattern);
    if (match) return route.crumbs(match);
  }
  return [{ label: 'Overview' }];
}

function usePageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Overview';
  if (pathname === '/scans') return 'Scans';
  if (pathname === '/executive') return 'Insights';
  if (pathname === '/organization') return 'Repositories';
  if (/\/scans\/[^/]+\/propagation/.test(pathname)) return 'Attack Paths';
  if (/\/scans\/[^/]+\/dependency-tree/.test(pathname)) return 'Dependency Tree';
  if (/\/scans\/[^/]+\/graph/.test(pathname)) return 'Dependency Graph';
  if (/\/scans\/[^/]+\/risk-summary/.test(pathname)) return 'Risk Summary';
  if (/\/scans\/[^/]+/.test(pathname)) return 'Scan Detail';
  return 'TraceLock';
}

/* ── Icons (inline SVG, zero dependency) ────────────────────────── */
function IconOverview() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="11" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="11" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconScans() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 5.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInsights() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 14l4-5.5 3 2.5 3.5-5L16 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRepositories() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 7h13" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 7v8.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M11 2L4 5.5V10C4 14.5 7 18.2 11 19.5C15 18.2 18 14.5 18 10V5.5L11 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M8 11L10 13L14 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Nav config ─────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', Icon: IconOverview },
  { to: '/scans', label: 'Scans', Icon: IconScans },
  { to: '/executive', label: 'Insights', Icon: IconInsights },
  { to: '/organization', label: 'Repositories', Icon: IconRepositories },
];

/* ── Breadcrumb ─────────────────────────────────────────────────── */
function Breadcrumb({ crumbs }: { crumbs: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={i} className="topbar-breadcrumb-item">
          {i > 0 && (
            <span className="topbar-breadcrumb-sep" aria-hidden="true">
              <IconChevron />
            </span>
          )}
          {crumb.href ? (
            <NavLink to={crumb.href} className="topbar-breadcrumb-link">
              {crumb.label}
            </NavLink>
          ) : (
            <span className="topbar-breadcrumb-current" aria-current="page">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ── Shell ──────────────────────────────────────────────────────── */
export default function Shell({ children }: { children: React.ReactNode }) {
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const queryClient = useQueryClient();
  const location = useLocation();

  const crumbs = useBreadcrumbs(location.pathname);
  const pageTitle = usePageTitle(location.pathname);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['scans'] });
    setToast({
      message: 'Scan complete — dashboard updated with new risk data.',
      type: 'success',
    });
  };

  return (
    <div className="app-root">
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="sidebar" role="navigation" aria-label="Primary navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-mark" aria-label="TraceLock">
            <IconShield />
          </div>
          <span className="brand-wordmark">TraceLock</span>
        </div>

        {/* Run Scan CTA */}
        <button
          className="sidebar-scan-btn"
          onClick={() => setShowUpload(true)}
          aria-label="Run a new dependency scan"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New Scan
        </button>

        {/* Nav section label */}
        <div className="sidebar-section-label">Navigation</div>

        {/* Nav links */}
        <nav className="sidebar-nav" aria-label="App sections">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-nav-link${isActive ? ' sidebar-nav-link--active' : ''}`
              }
            >
              <span className="sidebar-nav-icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="sidebar-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="sidebar-footer">
          <div className="sidebar-env-badge">Production</div>
          <span className="sidebar-version">v0.1.0</span>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div className="main">
        {/* Topbar */}
        <header className="topbar" role="banner">
          <div className="topbar-left">
            <Breadcrumb crumbs={crumbs} />
            <h1 className="topbar-title">{pageTitle}</h1>
          </div>

          <div className="topbar-right">
            <button
              className="topbar-scan-btn"
              onClick={() => setShowUpload(true)}
              aria-label="Run a new dependency scan"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Run scan
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="content" id="main-content">
          {children}
        </main>
      </div>

      {/* ── Modals & toasts ─────────────────────────────────────── */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleSuccess}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}