'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface TranslatedTextProps {
  text: string;
  showTranslation?: boolean;
  targetLanguage?: string;
  className?: string;
  loadingText?: string;
}

/**
 * Component that shows original text with optional Korean translation
 */
export function TranslatedText({
  text,
  showTranslation = false,
  targetLanguage = 'ko',
  className = '',
  loadingText = '...',
}: TranslatedTextProps) {
  const { translate, isLoading } = useTranslation();
  const [translation, setTranslation] = useState<string | null>(null);

  useEffect(() => {
    if (showTranslation && !translation) {
      translate(text, targetLanguage).then(setTranslation);
    }
  }, [showTranslation, text, targetLanguage, translate, translation]);

  if (!showTranslation) {
    return <span className={className}>{text}</span>;
  }

  if (isLoading && !translation) {
    return <span className={className}>{loadingText}</span>;
  }

  return (
    <span className={className}>
      {translation || text}
    </span>
  );
}

interface TranslatedMessageProps {
  original: string;
  showBoth?: boolean;
  showTranslation?: boolean;
  targetLanguage?: string;
  className?: string;
  originalClassName?: string;
  translationClassName?: string;
}

/**
 * Component that shows both original and translated text
 */
export function TranslatedMessage({
  original,
  showBoth = false,
  showTranslation = false,
  targetLanguage = 'ko',
  className = '',
  originalClassName = '',
  translationClassName = 'text-muted-foreground text-sm mt-1',
}: TranslatedMessageProps) {
  const { translate, isLoading } = useTranslation();
  const [translation, setTranslation] = useState<string | null>(null);

  useEffect(() => {
    if ((showBoth || showTranslation) && !translation) {
      translate(original, targetLanguage).then(setTranslation);
    }
  }, [showBoth, showTranslation, original, targetLanguage, translate, translation]);

  // Show only translation
  if (showTranslation && !showBoth) {
    if (isLoading && !translation) {
      return <div className={className}>...</div>;
    }
    return <div className={className}>{translation || original}</div>;
  }

  // Show only original
  if (!showBoth && !showTranslation) {
    return <div className={`${className} ${originalClassName}`}>{original}</div>;
  }

  // Show both
  return (
    <div className={className}>
      <div className={originalClassName}>{original}</div>
      {(isLoading && !translation) ? (
        <div className={translationClassName}>...</div>
      ) : translation && translation !== original ? (
        <div className={translationClassName}>{translation}</div>
      ) : null}
    </div>
  );
}

interface TranslationToggleProps {
  showTranslation: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Button to toggle translation display
 */
export function TranslationToggle({
  showTranslation,
  onToggle,
  className = '',
}: TranslationToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
        showTranslation
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      } ${className}`}
      title={showTranslation ? 'Show original (English)' : 'Show Korean translation'}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <span>{showTranslation ? 'KO' : 'EN'}</span>
    </button>
  );
}

interface AgentMessageWithTranslationProps {
  agentName: string;
  agentColor?: string;
  content: string;
  timestamp?: string;
  showTranslation?: boolean;
  className?: string;
}

/**
 * Agent message component with built-in translation support
 */
export function AgentMessageWithTranslation({
  agentName,
  agentColor = '#6366f1',
  content,
  timestamp,
  showTranslation = false,
  className = '',
}: AgentMessageWithTranslationProps) {
  const { translate, isLoading } = useTranslation();
  const [translation, setTranslation] = useState<string | null>(null);

  useEffect(() => {
    if (showTranslation && !translation) {
      translate(content, 'ko').then(setTranslation);
    }
  }, [showTranslation, content, translate, translation]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span
          className="font-medium text-sm"
          style={{ color: agentColor }}
        >
          {agentName}
        </span>
        {timestamp && (
          <span className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="pl-0">
        {/* Original message */}
        <p className="text-sm">{content}</p>

        {/* Korean translation */}
        {showTranslation && (
          <div className="mt-1 pt-1 border-t border-border/50">
            {isLoading && !translation ? (
              <p className="text-xs text-muted-foreground italic">
                Translating...
              </p>
            ) : translation && translation !== content ? (
              <p className="text-xs text-muted-foreground">
                {translation}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
