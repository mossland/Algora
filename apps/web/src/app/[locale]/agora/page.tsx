'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { fetchAgents, fetchAgoraSessions, fetchSessionWithMessages, type AgoraSession, type AgoraMessage } from '@/lib/api';
import { NewSessionModal } from '@/components/agora/NewSessionModal';
import { SessionDetailModal } from '@/components/agora/SessionDetailModal';
import { HelpTooltip } from '@/components/guide/HelpTooltip';

// Terminal components
import { CRTOverlay } from '@/components/terminal/CRTOverlay';
import { StatusGlyph } from '@/components/terminal/StatusGlyph';
import { TerminalSessionCard } from '@/components/agora/TerminalSessionCard';
import { TerminalChatMessage } from '@/components/agora/TerminalChatMessage';
import { TerminalParticipantList } from '@/components/agora/TerminalParticipantList';
import { TerminalInputBox } from '@/components/agora/TerminalInputBox';
import { useTerminalClock } from '@/hooks/useTypingAnimation';

// Helper to parse summoned_agents JSON string
function parseParticipants(summoned_agents: string | null): string[] {
  if (!summoned_agents) return [];
  try {
    const parsed = JSON.parse(summoned_agents);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AgoraPage() {
  const t = useTranslations('Agora');
  const tGuide = useTranslations('Guide.tooltips');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState<AgoraSession | null>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const terminalClock = useTerminalClock();

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['agora-sessions'],
    queryFn: fetchAgoraSessions,
    refetchInterval: 5000,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  // Fetch messages for active session
  const { data: sessionData } = useQuery({
    queryKey: ['agora-session', activeSessionId],
    queryFn: () => fetchSessionWithMessages(activeSessionId!),
    enabled: !!activeSessionId,
    refetchInterval: 3000,
  });

  const activeSession = sessionData?.session || sessions?.find((s: AgoraSession) => s.id === activeSessionId);
  const messages = sessionData?.messages || [];
  const activeSessions = sessions?.filter((s: AgoraSession) => s.status === 'active') || [];
  const pendingSessions = sessions?.filter((s: AgoraSession) => s.status === 'pending') || [];
  const concludedSessions = sessions?.filter((s: AgoraSession) => s.status === 'concluded' || s.status === 'completed') || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    // TODO: Implement actual message sending via WebSocket
    setMessage('');
  };

  // Track new messages for typing animation
  useEffect(() => {
    if (messages.length > 0) {
      const latestId = messages[messages.length - 1]?.id;
      if (latestId !== lastMessageId) {
        setLastMessageId(latestId);
      }
    }
  }, [messages, lastMessageId]);

  return (
    <CRTOverlay intensity="subtle" className="h-[calc(100vh-8rem)]">
      <div className="flex h-full flex-col gap-4 font-terminal">
        {/* Terminal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* ASCII Header Box */}
            <div className="font-terminal text-xs">
              <div className="ascii-border">╔{'═'.repeat(40)}╗</div>
              <div className="flex items-center px-2">
                <span className="ascii-border">║</span>
                <span className="flex-1 px-2">
                  <span className="terminal-glow-strong text-slate-900 font-semibold tracking-wider">
                    ALGORA AGORA v2.0
                  </span>
                  <span className="text-slate-400 ml-4">[{terminalClock}]</span>
                  <span className="ml-4">
                    <StatusGlyph status="active" pulse size="sm" />
                    <span className="ml-1 text-agora-primary">ONLINE</span>
                  </span>
                </span>
                <span className="ascii-border">║</span>
              </div>
              <div className="ascii-border">╚{'═'.repeat(40)}╝</div>
            </div>
            <HelpTooltip content={tGuide('agora')} />
          </div>
          <button
            onClick={() => setShowNewSession(true)}
            className="font-terminal text-xs flex items-center gap-2 rounded-lg terminal-box px-4 py-2 text-slate-900 transition-colors hover:terminal-glow"
          >
            <Plus className="h-4 w-4" />
            {t('startSession')}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Sessions Sidebar */}
          <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto pr-2">
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div>
                <div className="font-terminal text-xs mb-2 flex items-center gap-2">
                  <StatusGlyph status="active" pulse size="sm" />
                  <span className="text-slate-900 uppercase tracking-wider">
                    Active Sessions ({activeSessions.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {activeSessions.map((session: AgoraSession, index: number) => (
                    <TerminalSessionCard
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      index={index}
                      onClick={() => setActiveSessionId(session.id)}
                      onDetailClick={() => setDetailSession(session)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Sessions */}
            {pendingSessions.length > 0 && (
              <div>
                <div className="font-terminal text-xs mb-2 flex items-center gap-2">
                  <StatusGlyph status="pending" size="sm" />
                  <span className="text-slate-500 uppercase tracking-wider">
                    Pending ({pendingSessions.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingSessions.map((session: AgoraSession, index: number) => (
                    <TerminalSessionCard
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      index={index}
                      onClick={() => setActiveSessionId(session.id)}
                      onDetailClick={() => setDetailSession(session)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            {concludedSessions.length > 0 && (
              <div>
                <div className="font-terminal text-xs mb-2 flex items-center gap-2">
                  <StatusGlyph status="success" size="sm" />
                  <span className="text-slate-500 uppercase tracking-wider">
                    Recent ({concludedSessions.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {concludedSessions.slice(0, 5).map((session: AgoraSession, index: number) => (
                    <TerminalSessionCard
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      index={index}
                      onClick={() => setActiveSessionId(session.id)}
                      onDetailClick={() => setDetailSession(session)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Sessions */}
            {!sessionsLoading && !sessions?.length && (
              <div className="font-terminal text-xs rounded-lg terminal-box p-4 text-center">
                <div className="ascii-border text-2xl mb-2">[ ]</div>
                <p className="text-slate-500">{t('noActiveSession')}</p>
                <button
                  onClick={() => setShowNewSession(true)}
                  className="mt-3 text-agora-primary hover:terminal-glow transition-all"
                >
                  &gt; {t('startSession')}
                </button>
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex flex-1 flex-col rounded-lg terminal-box overflow-hidden">
            {activeSession ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-agora-primary/20 p-3 bg-slate-50/50">
                  <div className="font-terminal text-xs">
                    <div className="ascii-border mb-1">╔{'═'.repeat(50)}╗</div>
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <span className="terminal-glow text-slate-900 font-semibold">
                          {activeSession.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-500">
                        <span>[{parseParticipants(activeSession.summoned_agents).length} agents]</span>
                        <span>Round: {activeSession.current_round}/{activeSession.max_rounds}</span>
                      </div>
                    </div>
                    <div className="ascii-border mt-1">╚{'═'.repeat(50)}╝</div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {messages.length > 0 ? (
                      messages.map((msg: AgoraMessage, index: number) => (
                        <TerminalChatMessage
                          key={msg.id}
                          message={{
                            id: msg.id,
                            agentId: msg.agent_id || '',
                            agentName: msg.display_name || msg.agent_name || 'Unknown',
                            agentColor: msg.color || '#6366f1',
                            content: msg.content,
                            timestamp: msg.created_at,
                            tier: msg.tier_used,
                          }}
                          index={index}
                          isNew={msg.id === lastMessageId}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 font-terminal text-xs text-slate-400">
                        <div className="ascii-border text-4xl mb-4">[ _ ]</div>
                        <p>No messages yet. Awaiting agent discussion...</p>
                        <p className="mt-2 text-agora-primary animate-glyph-pulse">
                          &gt; Start the discussion_
                        </p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-agora-primary/20 p-3">
                  <TerminalInputBox
                    onSend={handleSendMessage}
                    placeholder={t('sendMessage')}
                    promptStyle="full"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center font-terminal">
                <div className="ascii-border text-6xl mb-4 text-slate-300">
                  {'[ '}
                  <span className="animate-glyph-pulse">?</span>
                  {' ]'}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 terminal-glow">
                  {t('noActiveSession')}
                </h3>
                <p className="mt-2 text-xs text-slate-500">
                  Select a session from the sidebar or start a new one
                </p>
                <button
                  onClick={() => setShowNewSession(true)}
                  className="mt-4 flex items-center gap-2 rounded-lg terminal-box px-4 py-2 text-xs text-slate-900 transition-colors hover:terminal-glow"
                >
                  <Plus className="h-4 w-4" />
                  {t('startSession')}
                </button>
              </div>
            )}
          </div>

          {/* Participants Sidebar */}
          {activeSession && (
            <div className="w-64 flex-shrink-0">
              <TerminalParticipantList
                agents={agents || []}
                participants={parseParticipants(activeSession.summoned_agents)}
              />
            </div>
          )}
        </div>

      {/* New Session Modal */}
      {showNewSession && (
        <NewSessionModal
          onClose={() => setShowNewSession(false)}
          onCreated={(sessionId) => {
            setActiveSessionId(sessionId);
            setShowNewSession(false);
            queryClient.invalidateQueries({ queryKey: ['agora-sessions'] });
          }}
        />
      )}

      {/* Session Detail Modal */}
      {detailSession && (
        <SessionDetailModal
          session={detailSession}
          agents={agents || []}
          onClose={() => setDetailSession(null)}
          onJoinSession={() => {
            setActiveSessionId(detailSession.id);
            setDetailSession(null);
          }}
        />
      )}
      </div>
    </CRTOverlay>
  );
}
