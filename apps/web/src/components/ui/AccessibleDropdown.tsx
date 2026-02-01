'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface AccessibleDropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

/**
 * AccessibleDropdown - Now wraps Shadcn DropdownMenu
 */
export function AccessibleDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  className,
  buttonClassName,
  disabled = false,
}: AccessibleDropdownProps) {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm',
            'border-agora-border dark:border-agora-dark-border bg-agora-card dark:bg-agora-dark-card text-slate-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-agora-primary focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            buttonClassName
          )}
        >
          <span className={cn(!selectedOption && 'text-agora-muted')}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className="h-4 w-4 text-agora-muted" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              disabled={option.disabled}
              onSelect={() => onChange(option.value)}
              className={cn(
                option.value === value && 'font-medium text-agora-primary'
              )}
            >
              {option.icon && <span className="mr-2">{option.icon}</span>}
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
