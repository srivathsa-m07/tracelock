import type React from 'react';
import './badge.css';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

interface BadgeProps {
  severity: Severity;
  children?: React.ReactNode;
  className?: string;
}

const severityColors: Record<Severity, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-600 text-white',
  medium: 'bg-amber-600 text-white',
  low: 'bg-green-600 text-white',
  unknown: 'bg-gray-600 text-white',
};

export default function Badge({ severity, children, className }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  const color = severityColors[severity] || severityColors.unknown;
  return (
    <span className={[base, color, className].filter(Boolean).join(' ')}>
      {children ?? severity.toUpperCase()}
    </span>
  );
}
