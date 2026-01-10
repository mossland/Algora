'use client';

import { ReactNode } from 'react';

// Box-drawing characters
const BORDERS = {
  double: {
    tl: '╔', tr: '╗', bl: '╚', br: '╝',
    h: '═', v: '║',
    lt: '╠', rt: '╣', tt: '╦', bt: '╩',
  },
  single: {
    tl: '┌', tr: '┐', bl: '└', br: '┘',
    h: '─', v: '│',
    lt: '├', rt: '┤', tt: '┬', bt: '┴',
  },
  rounded: {
    tl: '╭', tr: '╮', bl: '╰', br: '╯',
    h: '─', v: '│',
    lt: '├', rt: '┤', tt: '┬', bt: '┴',
  },
};

interface ASCIIBoxProps {
  children: ReactNode;
  title?: string;
  variant?: 'single' | 'double' | 'rounded';
  glow?: boolean;
  className?: string;
  headerDivider?: boolean;
  animate?: boolean;
}

export function ASCIIBox({
  children,
  title,
  variant = 'double',
  glow = false,
  className = '',
  headerDivider = false,
  animate = false,
}: ASCIIBoxProps) {
  const border = BORDERS[variant];

  return (
    <div
      className={`
        font-terminal text-sm
        ${glow ? 'terminal-glow' : ''}
        ${animate ? 'animate-border-draw' : ''}
        ${className}
      `}
    >
      {/* Top border with optional title */}
      <div className="ascii-border whitespace-pre select-none">
        {title ? (
          <>
            {border.tl}{border.h}{border.h}{' '}
            <span className={`${glow ? 'terminal-glow-strong' : ''} text-slate-900`}>
              {title}
            </span>
            {' '}{border.h.repeat(Math.max(0, 30 - title.length))}{border.tr}
          </>
        ) : (
          <>{border.tl}{border.h.repeat(36)}{border.tr}</>
        )}
      </div>

      {/* Header divider if title exists */}
      {title && headerDivider && (
        <div className="ascii-border whitespace-pre select-none">
          {border.lt}{border.h.repeat(36)}{border.rt}
        </div>
      )}

      {/* Content with side borders */}
      <div className="relative">
        <span className="ascii-border absolute left-0 top-0 bottom-0 select-none">{border.v}</span>
        <div className="px-4 py-2 min-h-[2rem]">
          {children}
        </div>
        <span className="ascii-border absolute right-0 top-0 bottom-0 select-none">{border.v}</span>
      </div>

      {/* Bottom border */}
      <div className="ascii-border whitespace-pre select-none">
        {border.bl}{border.h.repeat(36)}{border.br}
      </div>
    </div>
  );
}

// Simple inline ASCII box for single-line content
interface ASCIIInlineBoxProps {
  children: ReactNode;
  variant?: 'single' | 'double';
  className?: string;
}

export function ASCIIInlineBox({
  children,
  className = '',
}: ASCIIInlineBoxProps) {
  return (
    <span className={`font-terminal text-sm ${className}`}>
      <span className="ascii-border">[</span>
      {children}
      <span className="ascii-border">]</span>
    </span>
  );
}

// ASCII horizontal divider
interface ASCIIDividerProps {
  variant?: 'single' | 'double';
  width?: number;
  className?: string;
}

export function ASCIIDivider({
  variant = 'single',
  width = 36,
  className = '',
}: ASCIIDividerProps) {
  const border = BORDERS[variant];

  return (
    <div className={`font-terminal ascii-border select-none ${className}`}>
      {border.h.repeat(width)}
    </div>
  );
}
