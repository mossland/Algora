'use client';

import { useTypingAnimation } from '@/hooks/useTypingAnimation';
import { BlinkingCursor } from './BlinkingCursor';

interface TypingTextProps {
  text: string;
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
  cursorChar?: string;
  onComplete?: () => void;
  skip?: boolean;
  className?: string;
  cursorClassName?: string;
}

export function TypingText({
  text,
  speed = 30,
  startDelay = 0,
  showCursor = true,
  cursorChar = '▌',
  onComplete,
  skip = false,
  className = '',
  cursorClassName = '',
}: TypingTextProps) {
  const { displayedText, isTyping, isComplete } = useTypingAnimation({
    text,
    speed,
    startDelay,
    onComplete,
    skip,
  });

  return (
    <span className={`font-terminal ${className}`}>
      {displayedText}
      {showCursor && (isTyping || !isComplete) && (
        <BlinkingCursor char={cursorChar} className={cursorClassName} />
      )}
    </span>
  );
}

// Pre-formatted typing text with line breaks support
interface TypingBlockProps {
  lines: string[];
  speed?: number;
  lineDelay?: number;
  showCursor?: boolean;
  className?: string;
}

export function TypingBlock({
  lines,
  speed = 30,
  showCursor = true,
  className = '',
}: TypingBlockProps) {
  const fullText = lines.join('\n');

  return (
    <pre className={`font-terminal whitespace-pre-wrap ${className}`}>
      <TypingText text={fullText} speed={speed} showCursor={showCursor} />
    </pre>
  );
}
