'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Zap, LogOut, MessageCircle, User } from 'lucide-react';
import type { Agent } from '@/lib/api';
import { summonAgent, dismissAgent } from '@/lib/api';

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  idle: 'bg-gray-500',
  active: 'bg-agora-success',
  speaking: 'bg-agora-accent',
  listening: 'bg-agora-primary',
};

export function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  const t = useTranslations('Agents');
  const queryClient = useQueryClient();
  const status = agent.status || 'idle';

  const summonMutation = useMutation({
    mutationFn: () => summonAgent(agent.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: () => dismissAgent(agent.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-agora-border bg-agora-dark p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-agora-muted transition-colors hover:bg-agora-card hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Agent Header */}
        <div className="flex items-start gap-4">
          <div className="relative">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white"
              style={{ backgroundColor: agent.color || '#6366f1' }}
            >
              {agent.display_name?.charAt(0) || agent.name.charAt(0)}
            </div>
            <span
              className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-agora-dark ${statusColors[status]}`}
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">
              {agent.display_name || agent.name}
            </h2>
            <p className="text-sm text-agora-muted">@{agent.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-agora-card px-2 py-0.5 text-xs text-agora-muted">
                {t(`groups.${agent.group_name}`)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  status === 'idle'
                    ? 'bg-gray-500/20 text-gray-400'
                    : status === 'active'
                      ? 'bg-agora-success/20 text-agora-success'
                      : status === 'speaking'
                        ? 'bg-agora-accent/20 text-agora-accent'
                        : 'bg-agora-primary/20 text-agora-primary'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusColors[status]}`} />
                {t(`status.${status}`)}
              </span>
            </div>
          </div>
        </div>

        {/* Persona */}
        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <User className="h-4 w-4" />
            Persona
          </h3>
          <p className="mt-2 text-sm text-agora-muted leading-relaxed">
            {agent.persona_prompt || 'No persona description available.'}
          </p>
        </div>

        {/* Recent Activity */}
        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageCircle className="h-4 w-4" />
            {t('recentActivity')}
          </h3>
          <div className="mt-2 rounded-lg bg-agora-darker p-3">
            <p className="text-sm text-agora-muted italic">
              {status === 'idle'
                ? 'Currently idle, waiting to be summoned...'
                : status === 'speaking'
                  ? 'Currently speaking in Agora...'
                  : status === 'listening'
                    ? 'Listening to the discussion...'
                    : 'Participating in governance activities...'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {status === 'idle' ? (
            <button
              onClick={() => summonMutation.mutate()}
              disabled={summonMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-agora-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-agora-primary/80 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              {summonMutation.isPending ? 'Summoning...' : t('summon')}
            </button>
          ) : (
            <button
              onClick={() => dismissMutation.mutate()}
              disabled={dismissMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-agora-card px-4 py-2.5 font-medium text-white transition-colors hover:bg-agora-border disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {dismissMutation.isPending ? 'Dismissing...' : t('dismiss')}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg bg-agora-card px-4 py-2.5 font-medium text-agora-muted transition-colors hover:bg-agora-border hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
