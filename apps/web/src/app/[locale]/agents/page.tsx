'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Users } from 'lucide-react';

import { fetchAgents, type Agent } from '@/lib/api';
import { AgentCard } from '@/components/agents/AgentCard';
import { AgentDetailModal } from '@/components/agents/AgentDetailModal';

const CLUSTERS = [
  'visionaries',
  'builders',
  'investors',
  'guardians',
  'operatives',
  'moderators',
  'advisors',
] as const;

export default function AgentsPage() {
  const t = useTranslations('Agents');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  const filteredAgents = agents?.filter((agent: Agent) => {
    const matchesCluster = !selectedCluster || agent.group_name === selectedCluster;
    const matchesSearch =
      !searchQuery ||
      agent.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCluster && matchesSearch;
  });

  const agentsByCluster = CLUSTERS.reduce(
    (acc, cluster) => {
      acc[cluster] = filteredAgents?.filter((a: Agent) => a.group_name === cluster) || [];
      return acc;
    },
    {} as Record<string, Agent[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-agora-muted">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-agora-muted" />
          <span className="text-agora-muted">
            {filteredAgents?.length || 0} / {agents?.length || 0} agents
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agora-muted" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-agora-border bg-agora-card py-2 pl-10 pr-4 text-white placeholder-agora-muted focus:border-agora-primary focus:outline-none focus:ring-1 focus:ring-agora-primary"
          />
        </div>

        {/* Cluster Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-agora-muted" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCluster(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !selectedCluster
                  ? 'bg-agora-primary text-white'
                  : 'bg-agora-card text-agora-muted hover:bg-agora-border'
              }`}
            >
              {t('allClusters')}
            </button>
            {CLUSTERS.map((cluster) => (
              <button
                key={cluster}
                onClick={() => setSelectedCluster(cluster === selectedCluster ? null : cluster)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCluster === cluster
                    ? 'bg-agora-primary text-white'
                    : 'bg-agora-card text-agora-muted hover:bg-agora-border'
                }`}
              >
                {t(`groups.${cluster}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border border-agora-border bg-agora-card"
            />
          ))}
        </div>
      ) : selectedCluster ? (
        // Single cluster view
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAgents?.map((agent: Agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      ) : (
        // All clusters view
        <div className="space-y-8">
          {CLUSTERS.map((cluster) => {
            const clusterAgents = agentsByCluster[cluster];
            if (!clusterAgents?.length) return null;

            return (
              <div key={cluster}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <span>{t(`groups.${cluster}`)}</span>
                  <span className="text-sm font-normal text-agora-muted">
                    ({clusterAgents.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {clusterAgents.map((agent: Agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onClick={() => setSelectedAgent(agent)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
