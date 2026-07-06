import { Link } from 'react-router-dom';
import './landing.css';

/* ── Feature icon components ───────────────────────────────────────── */
function IconScan() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 7v4.5l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2L4 5.5V10C4 14.5 7 18.2 11 19.5C15 18.2 18 14.5 18 10V5.5L11 2Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 11L10 13L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGraph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="5" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 10L14.5 6M7.5 12L14.5 16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconAttack() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2L2 8v6l9 6 9-6V8l-9-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 8l9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 14v6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconSBOM() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="2" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h8M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTrend() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <polyline points="3,16 8,10 12,13 16,6 19,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="15,6 19,6 19,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Feature data ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    Icon: IconScan,
    title: 'Automated Scanning',
    desc: 'Upload your package.json or lockfile and get a complete risk assessment in seconds. No CI/CD integration required to start.',
  },
  {
    Icon: IconShieldCheck,
    title: 'Vulnerability Intelligence',
    desc: 'Every dependency is checked against the OSV database. Get severity ratings, CVSS scores, and fix recommendations.',
  },
  {
    Icon: IconGraph,
    title: 'Dependency Graph',
    desc: 'Interactive visualization of your entire dependency tree. See how packages connect and where risk concentrates.',
  },
  {
    Icon: IconAttack,
    title: 'Attack Path Analysis',
    desc: 'Trace how vulnerabilities propagate through transitive dependencies. Understand blast radius and exposure depth.',
  },
  {
    Icon: IconSBOM,
    title: 'SBOM Export',
    desc: 'Generate CycloneDX and SPDX software bills of materials. Meet compliance requirements with one click.',
  },
  {
    Icon: IconTrend,
    title: 'Risk Trends',
    desc: 'Track security posture over time. See how vulnerability counts and risk scores change across scan sessions.',
  },
];

/* ── Landing Page component ───────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-brand">
          <span className="landing-nav-brand-icon">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L4 5.5V10C4 14.5 7 18.2 11 19.5C15 18.2 18 14.5 18 10V5.5L11 2Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
                fill="currentColor" fillOpacity="0.15" />
              <path d="M8 11L10 13L14 9" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="landing-nav-brand-name">TraceLock</span>
        </Link>
        <div className="landing-nav-links">
          <Link to="/signin" className="landing-nav-link">Sign in</Link>
          <Link to="/signup" className="landing-nav-cta">Get Started</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-badge">
          <span className="landing-hero-badge-dot" />
          Open-source dependency security
        </div>

        <h1 className="landing-hero-title">
          Dependency risk
          <br />
          <span className="landing-hero-title-accent">intelligence</span> for
          <br />
          enterprise teams
        </h1>

        <p className="landing-hero-sub">
          TraceLock scans your software supply chain, maps vulnerability
          propagation through transitive dependencies, and surfaces the risks
          that actually matter — so your team can fix what counts.
        </p>

        <div className="landing-hero-actions">
          <Link to="/signup" className="landing-hero-btn-primary">
            Start scanning free
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link to="/dashboard" className="landing-hero-btn-secondary">
            View demo dashboard
          </Link>
        </div>
      </section>

      {/* ── Metrics bar ─────────────────────────────────────── */}
      <section className="landing-metrics">
        <div className="landing-metric">
          <div className="landing-metric-value">100%</div>
          <div className="landing-metric-label">Open source</div>
        </div>
        <div className="landing-metric">
          <div className="landing-metric-value">OSV</div>
          <div className="landing-metric-label">Vulnerability database</div>
        </div>
        <div className="landing-metric">
          <div className="landing-metric-value">npm</div>
          <div className="landing-metric-label">Ecosystem support</div>
        </div>
        <div className="landing-metric">
          <div className="landing-metric-value">&lt;30s</div>
          <div className="landing-metric-label">Scan time</div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="landing-features">
        <div className="landing-features-header">
          <div className="landing-features-eyebrow">Capabilities</div>
          <h2 className="landing-features-title">
            Everything you need to secure
            <br />
            your dependency supply chain
          </h2>
          <p className="landing-features-sub">
            From scanning to compliance, TraceLock gives your security team
            visibility into every layer of your software dependencies.
          </p>
        </div>

        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <f.Icon />
              </div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="landing-cta">
        <h2 className="landing-cta-title">
          Ready to secure your
          <br />
          supply chain?
        </h2>
        <p className="landing-cta-sub">
          Upload your first package.json and get a complete risk assessment
          in under 30 seconds. No credit card required.
        </p>
        <Link to="/signup" className="landing-hero-btn-primary">
          Get started free
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
            <path d="M11 2L4 5.5V10C4 14.5 7 18.2 11 19.5C15 18.2 18 14.5 18 10V5.5L11 2Z"
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          TraceLock &copy; {new Date().getFullYear()}
        </div>
        <div className="landing-footer-links">
          <Link to="/signin" className="landing-footer-link">Sign in</Link>
          <Link to="/signup" className="landing-footer-link">Sign up</Link>
          <Link to="/dashboard" className="landing-footer-link">Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
