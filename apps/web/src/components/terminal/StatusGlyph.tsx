'use client';

type Status = 'active' | 'idle' | 'speaking' | 'listening' | 'warning' | 'error' | 'success' | 'processing' | 'pending';

const GLYPHS: Record<Status, string> = {
  active: '●',
  idle: '○',
  speaking: '◉',
  listening: '◐',
  warning: '▲',
  error: '✖',
  success: '✔',
  processing: '⟳',
  pending: '◌',
};

const STATUS_CLASSES: Record<Status, string> = {
  active: 'glyph-active',
  idle: 'glyph-idle',
  speaking: 'glyph-speaking',
  listening: 'glyph-listening',
  warning: 'glyph-warning',
  error: 'glyph-error',
  success: 'glyph-success',
  processing: 'glyph-active',
  pending: 'glyph-idle',
};

interface StatusGlyphProps {
  status: Status;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export function StatusGlyph({
  status,
  pulse = false,
  size = 'md',
  className = '',
  label,
  showLabel = false,
}: StatusGlyphProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const shouldPulse = pulse || status === 'speaking' || status === 'processing';

  return (
    <span
      className={`
        font-terminal inline-flex items-center gap-1
        ${STATUS_CLASSES[status]}
        ${sizeClasses[size]}
        ${shouldPulse ? 'animate-glyph-pulse' : ''}
        ${className}
      `}
      title={label || status.toUpperCase()}
    >
      {GLYPHS[status]}
      {showLabel && (
        <span className="uppercase text-xs tracking-wider">
          {label || status}
        </span>
      )}
    </span>
  );
}

// Spinning loader for processing states
export function ProcessingSpinner({ className = '' }: { className?: string }) {
  return (
    <span className={`font-terminal glyph-active animate-spin-slow ${className}`}>
      ⟳
    </span>
  );
}

// Status badge with text
interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`
        font-terminal text-xs uppercase tracking-wider
        px-2 py-0.5 rounded
        ${STATUS_CLASSES[status]}
        ${status === 'active' ? 'bg-emerald-500/10' : ''}
        ${status === 'speaking' ? 'bg-cyan-500/10' : ''}
        ${status === 'warning' ? 'bg-amber-500/10' : ''}
        ${status === 'error' ? 'bg-red-500/10' : ''}
        ${status === 'idle' ? 'bg-slate-500/10' : ''}
        ${className}
      `}
    >
      <StatusGlyph status={status} size="sm" />
      <span className="ml-1">{status}</span>
    </span>
  );
}
