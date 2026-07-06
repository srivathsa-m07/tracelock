import type React from 'react';
import './card.css';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  flush?: boolean;
}

export default function Card({ title, children, className, actions, flush }: CardProps) {
  return (
    <div className={['card', className].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <div className="card-header">
          {title && <div className="card-title">{title}</div>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className={flush ? 'card-body-flush' : 'card-body'}>{children}</div>
    </div>
  );
}
