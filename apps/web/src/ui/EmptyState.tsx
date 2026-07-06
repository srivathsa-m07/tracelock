import type React from 'react';
import './emptystate.css';

interface EmptyStateProps {
  /** Optional icon element */
  Icon?: React.ReactNode;
  /** Title displayed prominently */
  title: string;
  /** Descriptive text */
  description: string;
  /** Call‑to‑action button label */
  ctaLabel?: string;
  /** Callback when CTA clicked */
  onCtaClick?: () => void;
  /** Additional class names */
  className?: string;
}

export default function EmptyState({
  Icon,
  title,
  description,
  ctaLabel,
  onCtaClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      {Icon && <div className="empty-state-icon" aria-hidden="true">{Icon}</div>}
      <h2 className="empty-state-title">{title}</h2>
      <p className="empty-state-body">{description}</p>
      {ctaLabel && onCtaClick && (
        <button className="btn btn-primary" onClick={onCtaClick}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
