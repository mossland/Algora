'use client';

import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: ReactNode;
  index?: number;
  animation?: 'slide-up' | 'slide-in-right' | 'slide-in-left' | 'scale-in' | 'bounce-in' | 'fade-in';
  hoverEffect?: boolean;
  glowOnActive?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

const animationClasses: Record<string, string> = {
  'slide-up': 'animate-slide-up',
  'slide-in-right': 'animate-slide-in-right',
  'slide-in-left': 'animate-slide-in-left',
  'scale-in': 'animate-scale-in',
  'bounce-in': 'animate-bounce-in',
  'fade-in': 'animate-fade-in',
};

export function AnimatedCard({
  children,
  index = 0,
  animation = 'slide-up',
  hoverEffect = true,
  glowOnActive = false,
  isActive = false,
  onClick,
  className = '',
}: AnimatedCardProps) {
  const delayMs = Math.min(index * 75, 500);

  const style: CSSProperties = {
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'backwards',
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-agora-border dark:border-agora-dark-border bg-agora-card dark:bg-agora-dark-card',
        animationClasses[animation] || animationClasses['slide-up'],
        hoverEffect && 'transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-agora-primary/10 hover:border-agora-primary/50',
        glowOnActive && isActive && 'ring-2 ring-agora-primary/30 border-agora-primary/50',
        onClick && 'cursor-pointer',
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

export function AnimatedListItem({
  children,
  index = 0,
  className = '',
}: AnimatedListItemProps) {
  const delayMs = Math.min(index * 50, 400);

  const style: CSSProperties = {
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'backwards',
  };

  return (
    <div
      className={cn('animate-slide-up', className)}
      style={style}
    >
      {children}
    </div>
  );
}
