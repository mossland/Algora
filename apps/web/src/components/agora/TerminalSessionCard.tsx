'use client';

import type { AgoraSession } from '@/lib/api';
import { StatusGlyph } from '@/components/terminal/StatusGlyph';
import { ASCIIProgressBar } from '@/components/terminal/ASCIIProgressBar';

interface TerminalSessionCardProps {
  session: AgoraSession;
  isActive: boolean;
  index?: number;
  onClick: () => void;
  onDetailClick?: () => void;
}

// Status mapping for terminal display
const STATUS_MAP: Record<string, 'active' | 'pending' | 'idle' | 'success'> = {
  active: 'active',
  pending: 'pending',
  concluded: 'success',
  completed: 'success',
};

function getParticipantCount(summoned_agents: string | null): number {
  if (!summoned_agents) return 0;
  try {
    const parsed = JSON.parse(summoned_agents);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function TerminalSessionCard({
  session,
  isActive,
  index = 0,
  onClick,
  onDetailClick,
}: TerminalSessionCardProps) {
  const participantCount = getParticipantCount(session.summoned_agents);
  const progressPercentage = session.max_rounds > 0
    ? Math.round((session.current_round / session.max_rounds) * 100)
    : 0;

  const status = STATUS_MAP[session.status] || 'idle';
  const isActiveSession = session.status === 'active';
  const createdAt = session.created_at ? new Date(session.created_at) : new Date();

  // Stagger delay for animation
  const delayMs = Math.min(index * 50, 400);

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetailClick?.();
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left font-terminal text-xs
        animate-slide-up
        transition-all duration-200
        ${isActive
          ? 'terminal-box terminal-glow'
          : 'border border-agora-border bg-white/80 hover:terminal-box'
        }
        ${isActiveSession && !isActive ? 'border-agora-primary/50' : ''}
        rounded-lg overflow-hidden
      `}
      style={{
        animationDelay: `${delayMs}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Top border line */}
      <div className="ascii-border px-2 py-1 bg-slate-50/50 border-b border-agora-border/50">
        ╔{'═'.repeat(32)}╗
      </div>

      {/* Header with status and time */}
      <div className="px-3 py-1 flex items-center justify-between border-b border-agora-border/30">
        <div className="flex items-center gap-2">
          <StatusGlyph
            status={status === 'success' ? 'success' : status === 'pending' ? 'pending' : 'active'}
            pulse={isActiveSession}
            size="sm"
          />
          <span className={`uppercase tracking-wider ${isActiveSession ? 'text-agora-primary' : 'text-slate-500'}`}>
            {session.status}
          </span>
        </div>
        <span className="text-slate-400">
          [{formatTime(createdAt)}]
        </span>
      </div>

      {/* Divider */}
      <div className="ascii-border px-2 text-center">
        ╠{'═'.repeat(32)}╣
      </div>

      {/* Title */}
      <div className="px-3 py-2">
        <div className="flex items-start gap-1">
          <span className="ascii-border-bright">&gt;</span>
          <span className={`truncate ${isActive ? 'terminal-glow text-slate-900' : 'text-slate-700'}`}>
            {session.title}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-3 py-1">
        <ASCIIProgressBar
          progress={progressPercentage}
          width={16}
          showPercentage={false}
          className="text-xs"
        />
      </div>

      {/* Stats */}
      <div className="px-3 py-1 flex items-center justify-between text-slate-500">
        <span>Agents: {participantCount}/30</span>
        <span>Round: {session.current_round}/{session.max_rounds}</span>
      </div>

      {/* Bottom border line */}
      <div className="ascii-border px-2 py-1 bg-slate-50/50 border-t border-agora-border/50">
        ╚{'═'.repeat(32)}╝
      </div>

      {/* Detail button overlay */}
      {onDetailClick && (
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDetailClick}
        >
          <span className="ascii-border hover:ascii-border-bright cursor-pointer">[i]</span>
        </div>
      )}
    </button>
  );
}
