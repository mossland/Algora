'use client';

import { useWittyMessage } from '@/hooks/useWittyMessage';
import { Loader2 } from 'lucide-react';

interface WittyLoaderProps {
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Category of messages to show */
  category?: 'loading' | 'agent' | 'signal';
  /** Custom messages */
  messages?: string[];
  /** Show spinner icon */
  showSpinner?: boolean;
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const spinnerSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

/**
 * A loader component with witty, rotating messages
 *
 * @example
 * <WittyLoader />
 *
 * @example
 * <WittyLoader category="signal" size="lg" />
 */
export function WittyLoader({
  size = 'md',
  category = 'loading',
  messages,
  showSpinner = true,
  className = '',
}: WittyLoaderProps) {
  const { message } = useWittyMessage({
    category,
    messages,
    interval: 2500,
  });

  return (
    <div className={`flex items-center gap-2 text-agora-muted ${sizeClasses[size]} ${className}`}>
      {showSpinner && (
        <Loader2 className={`animate-spin ${spinnerSizes[size]}`} />
      )}
      <span className="animate-pulse">{message}</span>
    </div>
  );
}

/**
 * Inline witty text without spinner
 */
export function WittyText({
  category = 'loading',
  messages,
  className = '',
}: Pick<WittyLoaderProps, 'category' | 'messages' | 'className'>) {
  const { message } = useWittyMessage({
    category,
    messages,
    interval: 3000,
  });

  return (
    <span className={`text-agora-muted italic ${className}`}>
      {message}
    </span>
  );
}

/**
 * Empty state with witty message
 */
interface WittyEmptyStateProps {
  type: 'sessions' | 'signals' | 'agents';
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function WittyEmptyState({
  type,
  icon,
  action,
  className = '',
}: WittyEmptyStateProps) {
  const categoryMap = {
    sessions: 'empty-sessions' as const,
    signals: 'empty-signals' as const,
    agents: 'empty-agents' as const,
  };

  const { message } = useWittyMessage({
    category: categoryMap[type],
    interval: 5000,
  });

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && <div className="mb-4 text-agora-muted">{icon}</div>}
      <p className="text-agora-muted italic animate-pulse">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
