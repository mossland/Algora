'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { BlinkingCursor } from '@/components/terminal/BlinkingCursor';
import { Send } from 'lucide-react';

interface TerminalInputBoxProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showPrompt?: boolean;
  promptStyle?: 'short' | 'full';
}

export function TerminalInputBox({
  onSend,
  placeholder = 'Type your message...',
  disabled = false,
  showPrompt = true,
  promptStyle = 'short',
}: TerminalInputBoxProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const prompt = promptStyle === 'full' ? 'algora@agora:~$ ' : '> ';

  return (
    <div
      className={`
        font-terminal text-sm
        rounded-lg overflow-hidden
        border transition-all duration-200
        ${isFocused
          ? 'border-agora-primary/50 terminal-box'
          : 'border-agora-border bg-white/80'
        }
      `}
    >
      {/* Top border */}
      <div className="ascii-border text-xs px-2 py-0.5 bg-slate-50/50">
        ╔{'═'.repeat(50)}╗
      </div>

      {/* Input area */}
      <div className="px-3 py-2 flex items-center gap-2">
        {/* Prompt */}
        {showPrompt && (
          <span className={`flex-shrink-0 ${isFocused ? 'terminal-glow text-agora-primary' : 'text-agora-secondary'}`}>
            {prompt}
          </span>
        )}

        {/* Input field */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={!isFocused ? placeholder : ''}
            className={`
              w-full bg-transparent outline-none
              text-slate-900 placeholder-slate-400
              font-terminal
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
          {/* Cursor shown when focused and no value */}
          {isFocused && !value && (
            <span className="absolute left-0 top-0">
              <BlinkingCursor />
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className={`
            flex-shrink-0 p-1 rounded
            transition-all duration-150
            ${value.trim() && !disabled
              ? 'text-agora-primary hover:bg-agora-primary/10 hover:terminal-glow'
              : 'text-slate-300 cursor-not-allowed'
            }
          `}
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom border */}
      <div className="ascii-border text-xs px-2 py-0.5 bg-slate-50/50">
        ╚{'═'.repeat(50)}╝
      </div>
    </div>
  );
}

// Minimal input variant
interface TerminalInputLineProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function TerminalInputLine({ onSend, disabled = false }: TerminalInputLineProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="font-terminal text-sm flex items-center gap-2 px-2 py-1 bg-slate-50/50 rounded border border-agora-border/50">
      <span className="text-agora-primary">&gt;</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type message..."
        className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400"
      />
      <BlinkingCursor visible={!value} />
    </div>
  );
}
