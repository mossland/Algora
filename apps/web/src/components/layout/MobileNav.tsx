'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Radio,
  AlertCircle,
  FileText,
  Shield,
  Settings,
  MessageSquare,
  Coins,
  BookOpen,
  Tv,
  Workflow,
  X,
  Menu,
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'live', href: '/live', icon: Tv, isLive: true },
  { key: 'guide', href: '/guide', icon: BookOpen },
  { key: 'governance', href: '/governance', icon: Workflow, isNew: true },
  { key: 'agora', href: '/agora', icon: MessageSquare },
  { key: 'agents', href: '/agents', icon: Users },
  { key: 'signals', href: '/signals', icon: Radio },
  { key: 'issues', href: '/issues', icon: AlertCircle },
  { key: 'proposals', href: '/proposals', icon: FileText },
  { key: 'treasury', href: '/treasury', icon: Coins },
  { key: 'disclosure', href: '/disclosure', icon: Shield },
  { key: 'engine', href: '/engine', icon: Settings },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MobileNav - Slide-out navigation drawer for mobile devices
 */
export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const t = useTranslations('Navigation');
  const pathname = usePathname();

  const locale = pathname.split('/')[1] || 'en';
  const currentPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-agora-dark border-r border-agora-border transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-agora-border px-4">
          <Link href={`/${locale}`} className="flex items-center gap-3" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-agora-primary to-agora-accent">
              <span className="text-lg font-bold text-slate-900">A</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Algora</span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-agora-muted hover:bg-agora-card hover:text-slate-900 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.href ||
              (item.href !== '/' && currentPath.startsWith(item.href));
            const isLive = 'isLive' in item && item.isLive;
            const isNew = 'isNew' in item && item.isNew;

            return (
              <Link
                key={item.key}
                href={`/${locale}${item.href}`}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-agora-primary/10 text-agora-primary'
                    : isLive
                      ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                      : isNew
                        ? 'text-agora-accent hover:bg-agora-accent/10 hover:text-agora-accent'
                        : 'text-agora-muted hover:bg-agora-card hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t(item.key)}</span>
                {isLive && (
                  <span className="relative flex h-2 w-2 ml-auto">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                )}
                {isNew && (
                  <span className="ml-auto rounded-full bg-agora-accent px-1.5 py-0.5 text-[10px] font-bold text-slate-900">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-agora-border p-4">
          <div className="rounded-lg bg-agora-card p-3">
            <p className="text-xs text-agora-muted">Powered by</p>
            <p className="text-sm font-medium text-slate-900">MOC Governance</p>
          </div>
        </div>
      </aside>
    </>
  );
}

interface MobileMenuButtonProps {
  onClick: () => void;
}

/**
 * MobileMenuButton - Hamburger menu button for mobile header
 */
export function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 rounded-lg text-agora-muted hover:bg-agora-card hover:text-slate-900 transition-colors"
      aria-label="Open menu"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}
