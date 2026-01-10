'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypingAnimationOptions {
  text: string;
  speed?: number; // ms per character
  startDelay?: number; // ms before starting
  onComplete?: () => void;
  skip?: boolean; // Skip animation and show full text immediately
  enabled?: boolean; // Control whether animation should run
}

interface UseTypingAnimationResult {
  displayedText: string;
  isTyping: boolean;
  isComplete: boolean;
  skipToEnd: () => void;
  restart: () => void;
  progress: number; // 0-100
}

export function useTypingAnimation({
  text,
  speed = 30,
  startDelay = 0,
  onComplete,
  skip = false,
  enabled = true,
}: UseTypingAnimationOptions): UseTypingAnimationResult {
  const [displayedText, setDisplayedText] = useState(skip ? text : '');
  const [isTyping, setIsTyping] = useState(!skip && enabled);
  const [isComplete, setIsComplete] = useState(skip);
  const [currentIndex, setCurrentIndex] = useState(skip ? text.length : 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Update callback ref
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Main typing effect
  useEffect(() => {
    if (skip || !enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      setIsTyping(false);
      setCurrentIndex(text.length);
      return;
    }

    // Reset state when text changes
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
    setIsTyping(true);

    // Start delay
    const startTimeout = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= text.length) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            setIsTyping(false);
            setIsComplete(true);
            onCompleteRef.current?.();
            return text.length;
          }
          return next;
        });
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(startTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed, startDelay, skip, enabled]);

  // Update displayed text when index changes
  useEffect(() => {
    setDisplayedText(text.slice(0, currentIndex));
  }, [currentIndex, text]);

  const skipToEnd = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setDisplayedText(text);
    setCurrentIndex(text.length);
    setIsTyping(false);
    setIsComplete(true);
    onCompleteRef.current?.();
  }, [text]);

  const restart = useCallback(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
    setIsTyping(true);
  }, []);

  const progress = text.length > 0 ? (currentIndex / text.length) * 100 : 100;

  return {
    displayedText,
    isTyping,
    isComplete,
    skipToEnd,
    restart,
    progress,
  };
}

// Hook for terminal clock display
export function useTerminalClock(format: 'HH:MM:SS' | 'HH:MM' = 'HH:MM:SS'): string {
  const [time, setTime] = useState(() => formatTime(new Date(), format));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date(), format));
    }, 1000);

    return () => clearInterval(interval);
  }, [format]);

  return time;
}

function formatTime(date: Date, format: 'HH:MM:SS' | 'HH:MM'): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return format === 'HH:MM:SS' ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
}
