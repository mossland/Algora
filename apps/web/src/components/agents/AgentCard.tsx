'use client';

import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import type { Agent } from '@/lib/api';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

const statusColors: Record<string, string> = {
  idle: 'bg-gray-500',
  active: 'bg-agora-success',
  speaking: 'bg-agora-accent',
  listening: 'bg-agora-primary',
};

const statusAnimations: Record<string, string> = {
  idle: '',
  active: 'animate-pulse',
  speaking: 'animate-bounce',
  listening: 'animate-pulse',
};

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const t = useTranslations('Agents');
  const status = agent.status || 'idle';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-agora-border bg-agora-card p-4 transition-all hover:border-agora-primary/50 hover:shadow-lg hover:shadow-agora-primary/10"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white transition-transform group-hover:scale-110"
            style={{ backgroundColor: agent.color || '#6366f1' }}
          >
            {agent.display_name?.charAt(0) || agent.name.charAt(0)}
          </div>
          <span
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-agora-card ${statusColors[status]} ${statusAnimations[status]}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">
            {agent.display_name || agent.name}
          </h3>
          <p className="text-xs text-agora-muted">
            {t(`groups.${agent.group_name}`)}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
            status === 'idle'
              ? 'bg-gray-500/20 text-gray-400'
              : status === 'active'
                ? 'bg-agora-success/20 text-agora-success'
                : status === 'speaking'
                  ? 'bg-agora-accent/20 text-agora-accent'
                  : 'bg-agora-primary/20 text-agora-primary'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${statusColors[status]} ${statusAnimations[status]}`}
          />
          {t(`status.${status}`)}
        </span>

        {status === 'speaking' && (
          <MessageCircle className="h-4 w-4 text-agora-accent animate-pulse" />
        )}
      </div>

      {/* Hover hint */}
      <div className="mt-3 text-center text-xs text-agora-muted opacity-0 transition-opacity group-hover:opacity-100">
        Click to view details
      </div>
    </div>
  );
}
