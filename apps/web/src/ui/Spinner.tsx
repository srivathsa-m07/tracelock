import './spinner.css';

/**
 * Spinner – a simple, accessible loading indicator.
 * The component uses an inline <div> with aria-label for screen readers.
 */
export default function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClass = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg',
  }[size];
  return (
    <div role="status" aria-live="polite" className={`spinner ${sizeClass} ${className}`}>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
