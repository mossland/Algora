'use client';

import { useTranslations } from 'next-intl';
import { formatDistanceToNow, format } from 'date-fns';
import {
  X,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  Loader2,
  Calendar,
  FileText,
  Play,
  ExternalLink,
  Share2,
} from 'lucide-react';
import type { AgoraSession, Agent } from '@/lib/api';

interface SessionDetailModalProps {
  session: AgoraSession;
  agents: Agent[];
  onClose: () => void;
  onJoinSession?: () => void;
}

const statusConfig: Record<string, {
  icon: typeof Clock;
  color: string;
  bg: string;
  border: string;
  animate?: string;
}> = {
  pending: {
    icon: Clock,
    color: 'text-agora-warning',
    bg: 'bg-agora-warning/10',
    border: 'border-agora-warning/30',
  },
  active: {
    icon: Loader2,
    color: 'text-agora-success',
    bg: 'bg-agora-success/10',
    border: 'border-agora-success/30',
    animate: 'animate-spin',
  },
  concluded: {
    icon: CheckCircle,
    color: 'text-agora-muted',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-agora-muted',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
};

function parseParticipants(summoned_agents: string | null): string[] {
  if (!summoned_agents) return [];
  try {
    const parsed = JSON.parse(summoned_agents);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SessionDetailModal({ session, agents, onClose, onJoinSession }: SessionDetailModalProps) {
  const t = useTranslations('Agora');
  const config = statusConfig[session.status] || statusConfig.active;
  const StatusIcon = config.icon;

  const participantIds = parseParticipants(session.summoned_agents);
  const participantAgents = agents.filter(agent =>
    participantIds.includes(agent.id) || participantIds.includes(agent.name)
  );

  const createdDate = session.created_at ? new Date(session.created_at) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="animate-fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 z-50 flex items-center justify-center sm:inset-10">
        <div className="animate-scale-in w-full max-w-2xl max-h-full overflow-hidden rounded-xl border border-agora-border bg-agora-dark shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-agora-border p-6">
            <div className="flex items-start gap-4">
              <div className={`rounded-lg border p-3 ${config.bg} ${config.border}`}>
                <StatusIcon className={`h-5 w-5 ${config.color} ${config.animate || ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
                  >
                    {t(`sessionStatus.${session.status === 'completed' ? 'concluded' : session.status}`)}
                  </span>
                  <span className="text-xs text-agora-muted">
                    Round {session.current_round}/{session.max_rounds}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white pr-8">{session.title}</h2>
                {session.description && (
                  <p className="mt-1 text-sm text-agora-muted line-clamp-2">
                    {session.description}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-agora-muted transition-colors hover:bg-agora-card hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-6">
            {/* Session Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Started */}
              <div className="rounded-lg border border-agora-border bg-agora-card p-4">
                <div className="flex items-center gap-2 mb-2 text-sm text-agora-muted">
                  <Calendar className="h-4 w-4" />
                  <span>{t('detail.started')}</span>
                </div>
                <p className="text-white font-medium">
                  {createdDate ? format(createdDate, 'PPpp') : 'Unknown'}
                </p>
                <p className="text-sm text-agora-muted mt-1">
                  {createdDate ? formatDistanceToNow(createdDate, { addSuffix: true }) : ''}
                </p>
              </div>

              {/* Duration / Status */}
              <div className="rounded-lg border border-agora-border bg-agora-card p-4">
                <div className="flex items-center gap-2 mb-2 text-sm text-agora-muted">
                  <Clock className="h-4 w-4" />
                  <span>{t('detail.duration')}</span>
                </div>
                <p className="text-white font-medium">
                  {session.status === 'active' && createdDate
                    ? formatDistanceToNow(createdDate)
                    : session.status === 'pending'
                      ? t('detail.notStarted')
                      : t('detail.sessionEnded')
                  }
                </p>
                <p className={`text-sm mt-1 ${
                  session.status === 'active' ? 'text-agora-success' : 'text-agora-muted'
                }`}>
                  {session.status === 'active' && t('detail.inProgress')}
                </p>
              </div>
            </div>

            {/* Participants */}
            <div className="mt-4 rounded-lg border border-agora-border bg-agora-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-agora-muted">
                  <Users className="h-4 w-4" />
                  <span>{t('detail.participants')}</span>
                </div>
                <span className="text-sm text-white font-medium">
                  {participantIds.length} {t('detail.agents')}
                </span>
              </div>

              {participantAgents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {participantAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-2 rounded-full bg-agora-darker px-3 py-1.5"
                    >
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: agent.color || '#6366f1' }}
                      >
                        {agent.display_name?.charAt(0) || agent.name.charAt(0)}
                      </div>
                      <span className="text-sm text-white">
                        {agent.display_name || agent.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : participantIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {participantIds.map((participantId) => (
                    <div
                      key={participantId}
                      className="rounded-full bg-agora-darker px-3 py-1.5 text-sm text-agora-muted"
                    >
                      {participantId}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-agora-muted italic">
                  No participants yet
                </p>
              )}
            </div>

            {/* Session Summary (for concluded sessions) */}
            {(session.status === 'concluded' || session.status === 'completed') && (
              <div className="mt-4 rounded-lg border border-agora-border bg-agora-card p-4">
                <div className="flex items-center gap-2 mb-3 text-sm text-agora-muted">
                  <FileText className="h-4 w-4" />
                  <span>{t('detail.summary')}</span>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  {t('detail.summaryPlaceholder')}
                </p>
              </div>
            )}

            {/* Activity Stats */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-agora-border bg-agora-card p-4 text-center">
                <MessageSquare className="h-6 w-6 text-agora-accent mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">--</p>
                <p className="text-xs text-agora-muted">{t('detail.messages')}</p>
              </div>
              <div className="rounded-lg border border-agora-border bg-agora-card p-4 text-center">
                <Users className="h-6 w-6 text-agora-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{participantIds.length}</p>
                <p className="text-xs text-agora-muted">{t('detail.agents')}</p>
              </div>
              <div className="rounded-lg border border-agora-border bg-agora-card p-4 text-center">
                <Clock className="h-6 w-6 text-agora-warning mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {session.status !== 'pending' && createdDate
                    ? Math.round((Date.now() - createdDate.getTime()) / 60000)
                    : '--'
                  }
                </p>
                <p className="text-xs text-agora-muted">{t('detail.minutes')}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-agora-border p-4">
            <div className="flex items-center gap-2 text-sm text-agora-muted">
              <span>ID: {session.id.slice(0, 8)}...</span>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg bg-agora-card px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-agora-border">
                <Share2 className="h-4 w-4" />
                {t('detail.share')}
              </button>

              {session.status === 'active' && onJoinSession && (
                <button
                  onClick={onJoinSession}
                  className="flex items-center gap-2 rounded-lg bg-agora-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-agora-primary/80"
                >
                  <Play className="h-4 w-4" />
                  {t('detail.joinSession')}
                </button>
              )}

              {session.status === 'pending' && (
                <button className="flex items-center gap-2 rounded-lg bg-agora-success px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-agora-success/80">
                  <Play className="h-4 w-4" />
                  {t('detail.startSession')}
                </button>
              )}

              {(session.status === 'concluded' || session.status === 'completed') && (
                <button className="flex items-center gap-2 rounded-lg bg-agora-card px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-agora-border">
                  <ExternalLink className="h-4 w-4" />
                  {t('detail.viewTranscript')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
