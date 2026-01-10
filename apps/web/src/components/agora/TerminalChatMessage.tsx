'use client';

import { useRef } from 'react';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';
import { BlinkingCursor } from '@/components/terminal/BlinkingCursor';

interface TerminalChatMessageProps {
  message: {
    id: string;
    agentId?: string;
    agentName: string;
    agentColor: string;
    content: string;
    timestamp: string;
    tier: number;
  };
  index?: number;
  isNew?: boolean; // Whether this is a newly arrived message
  onAgentClick?: (agentId: string) => void;
}

const tierLabels: Record<number, string> = {
  0: 'T0',
  1: 'T1',
  2: 'T2',
};

const tierColors: Record<number, string> = {
  0: 'text-slate-500',
  1: 'text-agora-primary',
  2: 'text-agora-secondary',
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function TerminalChatMessage({
  message,
  index = 0,
  isNew = false,
  onAgentClick,
}: TerminalChatMessageProps) {
  const hasAnimated = useRef(false);

  // Typing animation for new messages
  const { displayedText, isTyping } = useTypingAnimation({
    text: message.content,
    speed: 20,
    skip: !isNew || hasAnimated.current,
    enabled: isNew && !hasAnimated.current,
    onComplete: () => {
      hasAnimated.current = true;
    },
  });

  // Animation delay
  const delayMs = Math.min(index * 30, 300);

  const handleAgentClick = () => {
    if (message.agentId && onAgentClick) {
      onAgentClick(message.agentId);
    }
  };

  const contentToShow = isNew && !hasAnimated.current ? displayedText : message.content;

  return (
    <div
      className={`
        font-terminal text-sm
        animate-slide-in-left
        transition-colors duration-200
        rounded-lg overflow-hidden
        border border-agora-border/50
        bg-white/80
        hover:bg-white
        hover:border-agora-primary/30
      `}
      style={{
        animationDelay: `${delayMs}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Top border */}
      <div className="ascii-border text-xs px-2 py-0.5 bg-slate-50/50">
        ┌{'─'.repeat(50)}┐
      </div>

      {/* Header: timestamp, agent name, tier */}
      <div className="px-3 py-1 flex items-center gap-2 border-b border-agora-border/30 bg-slate-50/30">
        <span className="text-slate-400">[{formatTime(message.timestamp)}]</span>
        <button
          onClick={handleAgentClick}
          disabled={!message.agentId || !onAgentClick}
          className={`
            font-semibold transition-colors
            ${message.agentId && onAgentClick ? 'hover:text-agora-primary cursor-pointer' : ''}
          `}
          style={{ color: message.agentColor }}
        >
          &lt;{message.agentName}&gt;
        </button>
        <span className={`text-xs ${tierColors[message.tier]}`}>
          [{tierLabels[message.tier]}]
        </span>
      </div>

      {/* Divider */}
      <div className="ascii-border text-xs px-2">
        ├{'─'.repeat(50)}┤
      </div>

      {/* Content */}
      <div className="px-3 py-2 min-h-[2rem] text-slate-700 leading-relaxed whitespace-pre-wrap">
        {contentToShow}
        {isTyping && <BlinkingCursor />}
      </div>

      {/* Bottom border */}
      <div className="ascii-border text-xs px-2 py-0.5 bg-slate-50/50">
        └{'─'.repeat(50)}┘
      </div>
    </div>
  );
}

// Simplified version without box for dense chat view
interface TerminalChatLineProps {
  message: {
    id: string;
    agentName: string;
    agentColor: string;
    content: string;
    timestamp: string;
    tier: number;
  };
  isNew?: boolean;
}

export function TerminalChatLine({ message, isNew = false }: TerminalChatLineProps) {
  const { displayedText, isTyping } = useTypingAnimation({
    text: message.content,
    speed: 15,
    skip: !isNew,
  });

  const contentToShow = isNew ? displayedText : message.content;

  return (
    <div className="font-terminal text-sm py-1 hover:bg-slate-50/50 px-2 rounded transition-colors">
      <span className="text-slate-400">[{formatTime(message.timestamp)}]</span>
      {' '}
      <span style={{ color: message.agentColor }}>&lt;{message.agentName}&gt;</span>
      {' '}
      <span className={`text-xs ${tierColors[message.tier]}`}>[{tierLabels[message.tier]}]</span>
      {' '}
      <span className="text-slate-700">{contentToShow}</span>
      {isTyping && <BlinkingCursor />}
    </div>
  );
}
