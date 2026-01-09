'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, MessageSquare, AlertTriangle } from 'lucide-react';

import { fetchStats, type Activity as ActivityType, type Agent } from '@/lib/api';
import { StatsCard } from '@/components/ui/StatsCard';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { ActivityDetailModal } from '@/components/ui/ActivityDetailModal';
import { AgentLobbyPreview } from '@/components/agents/AgentLobbyPreview';
import { AgentDetailModal } from '@/components/agents/AgentDetailModal';
import { HelpTooltip } from '@/components/guide/HelpTooltip';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const tGuide = useTranslations('Guide.tooltips');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <HelpTooltip content={tGuide('dashboard')} />
        </div>
        <p className="text-agora-muted">{t('subtitle')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('stats.activeAgents')}
          value={stats?.activeAgents ?? 0}
          icon={<Users className="h-5 w-5" />}
          trend={stats?.agentsTrend}
        />
        <StatsCard
          title={t('stats.activeSessions')}
          value={stats?.activeSessions ?? 0}
          icon={<MessageSquare className="h-5 w-5" />}
          trend={stats?.sessionsTrend}
        />
        <StatsCard
          title={t('stats.signalsToday')}
          value={stats?.signalsToday ?? 0}
          icon={<Activity className="h-5 w-5" />}
          trend={stats?.signalsTrend}
        />
        <StatsCard
          title={t('stats.openIssues')}
          value={stats?.openIssues ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={(stats?.openIssues ?? 0) > 5 ? 'warning' : 'default'}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-agora-border bg-agora-card p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {t('activityFeed')}
            </h2>
            <ActivityFeed onActivityClick={setSelectedActivity} />
          </div>
        </div>

        {/* Agent Lobby Preview */}
        <div>
          <div className="rounded-lg border border-agora-border bg-agora-card p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {t('agentLobby')}
            </h2>
            <AgentLobbyPreview onAgentClick={setSelectedAgent} />
          </div>
        </div>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
