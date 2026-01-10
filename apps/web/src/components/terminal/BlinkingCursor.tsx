'use client';

interface BlinkingCursorProps {
  char?: string;
  className?: string;
  visible?: boolean;
}

export function BlinkingCursor({
  char = '▌',
  className = '',
  visible = true,
}: BlinkingCursorProps) {
  if (!visible) return null;

  return (
    <span
      className={`
        font-terminal
        blinking-cursor
        text-agora-primary
        ${className}
      `}
      aria-hidden="true"
    >
      {char}
    </span>
  );
}

// Block cursor variant
export function BlockCursor({ className = '' }: { className?: string }) {
  return <BlinkingCursor char="█" className={className} />;
}

// Underscore cursor variant
export function UnderscoreCursor({ className = '' }: { className?: string }) {
  return <BlinkingCursor char="_" className={className} />;
}
