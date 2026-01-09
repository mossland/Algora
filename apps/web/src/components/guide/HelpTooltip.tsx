'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({ content, title, position = 'bottom' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-agora-card border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-agora-card border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-agora-card border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-agora-card border-y-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="rounded-full p-1 text-agora-muted transition-colors hover:bg-agora-card hover:text-white focus:outline-none focus:ring-2 focus:ring-agora-primary"
        aria-label="Help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={`absolute z-[100] w-64 rounded-lg border border-agora-border bg-agora-card p-3 shadow-lg ${positionClasses[position]}`}
        >
          <div
            className={`absolute h-0 w-0 border-[6px] ${arrowClasses[position]}`}
          />
          {title && (
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">{title}</h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-agora-muted hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <p className="text-xs leading-relaxed text-agora-muted">{content}</p>
        </div>
      )}
    </div>
  );
}
