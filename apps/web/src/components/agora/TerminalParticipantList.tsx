'use client';

import type { Agent } from '@/lib/api';
import { StatusGlyph } from '@/components/terminal/StatusGlyph';

interface TerminalParticipantListProps {
  agents: Agent[];
  participants: string[];
  onSummon?: (agentId: string) => void;
}

type AgentStatus = 'idle' | 'active' | 'speaking' | 'listening';

const statusLabels: Record<AgentStatus, string> = {
  idle: 'IDLE',
  active: 'ACTIVE',
  speaking: 'SPEAKING',
  listening: 'LISTEN',
};

export function TerminalParticipantList({
  agents,
  participants,
  onSummon,
}: TerminalParticipantListProps) {
  const participantAgents = agents.filter((a) => participants.includes(a.id));
  const availableAgents = agents.filter(
    (a) => !participants.includes(a.id) && (a.status === 'idle' || !a.status)
  );

  // Sort participants by status
  const sortedParticipants = [...participantAgents].sort((a, b) => {
    const statusOrder: Record<string, number> = { speaking: 0, active: 1, listening: 2, idle: 3 };
    return (statusOrder[a.status || 'idle'] || 3) - (statusOrder[b.status || 'idle'] || 3);
  });

  return (
    <div className="font-terminal text-xs rounded-lg overflow-hidden border border-agora-border bg-white/90">
      {/* Top border */}
      <div className="ascii-border px-2 py-1 bg-slate-50/50">
        ╔{'═'.repeat(28)}╗
      </div>

      {/* Header */}
      <div className="px-3 py-2 border-b border-agora-border/50 bg-slate-50/30">
        <span className="terminal-glow text-slate-900 font-semibold tracking-wider">
          PARTICIPANTS [{participantAgents.length}/30]
        </span>
      </div>

      {/* Divider */}
      <div className="ascii-border px-2">
        ╠{'═'.repeat(28)}╣
      </div>

      {/* Participant list */}
      <div className="max-h-64 overflow-y-auto">
        {sortedParticipants.length > 0 ? (
          sortedParticipants.map((agent, index) => {
            const status = (agent.status as AgentStatus) || 'idle';
            const isSpeaking = status === 'speaking';
            const isActiveOrListening = status === 'active' || status === 'listening';

            return (
              <div
                key={agent.id}
                className={`
                  px-3 py-1.5 flex items-center justify-between
                  animate-slide-up
                  transition-all duration-200
                  ${isSpeaking ? 'bg-agora-secondary/10 terminal-glow' : ''}
                  ${isActiveOrListening ? 'bg-agora-primary/5' : ''}
                  hover:bg-slate-50
                `}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StatusGlyph
                    status={status}
                    pulse={isSpeaking || isActiveOrListening}
                    size="sm"
                  />
                  <span
                    className={`truncate ${isSpeaking ? 'text-agora-secondary font-semibold' : 'text-slate-700'}`}
                    title={agent.display_name || agent.name}
                  >
                    {agent.display_name || agent.name}
                  </span>
                </div>
                <span
                  className={`
                    text-[10px] uppercase tracking-wider
                    ${isSpeaking ? 'text-agora-secondary' : 'text-slate-400'}
                  `}
                >
                  [{statusLabels[status]}]
                </span>
              </div>
            );
          })
        ) : (
          <div className="px-3 py-4 text-center text-slate-400">
            No participants yet
          </div>
        )}
      </div>

      {/* Summon section */}
      {availableAgents.length > 0 && (
        <>
          {/* Divider */}
          <div className="ascii-border px-2">
            ╠{'═'.repeat(28)}╣
          </div>

          {/* Header */}
          <div className="px-3 py-1 text-slate-500 uppercase tracking-wider">
            SUMMON AGENT
          </div>

          {/* Divider */}
          <div className="ascii-border px-2">
            ╟{'─'.repeat(28)}╢
          </div>

          {/* Available agents */}
          <div className="px-2 py-2 flex flex-wrap gap-1">
            {availableAgents.slice(0, 6).map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSummon?.(agent.id)}
                className={`
                  px-2 py-0.5 rounded
                  text-slate-600 hover:text-agora-primary
                  hover:bg-agora-primary/10
                  transition-colors duration-150
                  border border-transparent hover:border-agora-primary/30
                `}
                title={agent.display_name || agent.name}
              >
                <span className="ascii-border-bright">⚡</span>
                <span className="ml-1 truncate max-w-[60px]">
                  {(agent.display_name || agent.name).slice(0, 8)}
                </span>
              </button>
            ))}
            {availableAgents.length > 6 && (
              <span className="px-2 py-0.5 text-slate-400">
                +{availableAgents.length - 6} more
              </span>
            )}
          </div>
        </>
      )}

      {/* Bottom border */}
      <div className="ascii-border px-2 py-1 bg-slate-50/50">
        ╚{'═'.repeat(28)}╝
      </div>
    </div>
  );
}
