import { Link } from 'react-router-dom';
import './notfound.css';

export default function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-code">404</div>
      <h1 className="notfound-title">Page not found</h1>
      <p className="notfound-desc">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>
      <div className="notfound-actions">
        <Link to="/" className="notfound-btn-primary">
          Go to homepage
        </Link>
        <Link to="/dashboard" className="notfound-btn-secondary">
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
