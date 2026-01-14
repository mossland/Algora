'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BudgetAllocation } from './AllocationCard';

interface AllocationDetailModalProps {
  allocation: BudgetAllocation | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusSteps = ['pending', 'approved', 'disbursed'] as const;

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
  approved: { icon: CheckCircle, color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
  disbursed: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/20' },
  cancelled: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/20' },
};

export function AllocationDetailModal({
  allocation,
  isOpen,
  onClose,
}: AllocationDetailModalProps) {
  const t = useTranslations('Treasury');
  const [mounted, setMounted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !allocation) return null;

  const formatBalance = (balance: string, decimals: number = 18) => {
    const value = BigInt(balance) / BigInt(10 ** decimals);
    return value.toLocaleString();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getCurrentStepIndex = () => {
    if (allocation.status === 'cancelled') return -1;
    return statusSteps.indexOf(allocation.status as typeof statusSteps[number]);
  };

  const currentStepIndex = getCurrentStepIndex();

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-agora-border bg-agora-dark p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-agora-muted transition-colors hover:bg-agora-card hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${statusConfig[allocation.status]?.bgColor}`}>
            <FileText className={`h-6 w-6 ${statusConfig[allocation.status]?.color}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t('modals.allocationDetail')}</h2>
            <p className="text-sm text-agora-muted">{allocation.category}</p>
          </div>
        </div>

        {/* Status Timeline */}
        {allocation.status !== 'cancelled' && (
          <div className="mb-6 rounded-lg bg-agora-card p-4">
            <h3 className="mb-3 text-sm font-medium text-slate-900">{t('status')}</h3>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const StepIcon = statusConfig[step].icon;

                return (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isCompleted
                            ? statusConfig[step].bgColor
                            : 'bg-agora-border'
                        }`}
                      >
                        <StepIcon
                          className={`h-4 w-4 ${
                            isCompleted ? statusConfig[step].color : 'text-agora-muted'
                          }`}
                        />
                      </div>
                      <span
                        className={`mt-1 text-xs ${
                          isCurrent ? 'font-medium text-slate-900' : 'text-agora-muted'
                        }`}
                      >
                        {t(`allocation.${step}`)}
                      </span>
                    </div>
                    {index < statusSteps.length - 1 && (
                      <ArrowRight
                        className={`mx-2 h-4 w-4 ${
                          index < currentStepIndex ? 'text-agora-accent' : 'text-agora-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled Status */}
        {allocation.status === 'cancelled' && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-400">{t('allocation.cancelled')}</span>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-4">
          {/* Amount */}
          <div className="rounded-lg bg-agora-card p-4">
            <div className="text-sm text-agora-muted">{t('amount')}</div>
            <div className="text-2xl font-bold text-agora-accent">
              {formatBalance(allocation.amount)} {allocation.tokenSymbol}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-lg bg-agora-card p-4">
            <div className="mb-1 text-sm text-agora-muted">{t('description')}</div>
            <div className="text-slate-900">{allocation.description}</div>
          </div>

          {/* Recipient */}
          <div className="rounded-lg bg-agora-card p-4">
            <div className="mb-1 text-sm text-agora-muted">{t('recipient')}</div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-slate-900">
                {formatAddress(allocation.recipient)}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => copyToClipboard(allocation.recipient, 'recipient')}
                  className="rounded p-1 text-agora-muted transition-colors hover:bg-agora-border hover:text-slate-900"
                >
                  {copiedField === 'recipient' ? (
                    <Check className="h-4 w-4 text-agora-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={`https://etherscan.io/address/${allocation.recipient}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-agora-muted transition-colors hover:bg-agora-border hover:text-slate-900"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Transaction Hash (if disbursed) */}
          {allocation.txHash && (
            <div className="rounded-lg bg-agora-card p-4">
              <div className="mb-1 text-sm text-agora-muted">{t('txHash')}</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-900">
                  {allocation.txHash.slice(0, 10)}...{allocation.txHash.slice(-8)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyToClipboard(allocation.txHash!, 'txHash')}
                    className="rounded p-1 text-agora-muted transition-colors hover:bg-agora-border hover:text-slate-900"
                  >
                    {copiedField === 'txHash' ? (
                      <Check className="h-4 w-4 text-agora-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <a
                    href={`https://etherscan.io/tx/${allocation.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1 text-agora-muted transition-colors hover:bg-agora-border hover:text-slate-900"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-agora-card p-4">
              <div className="mb-1 text-sm text-agora-muted">{t('createdAt')}</div>
              <div className="text-sm text-slate-900">
                {new Date(allocation.createdAt).toLocaleString()}
              </div>
            </div>
            {allocation.approvedAt && (
              <div className="rounded-lg bg-agora-card p-4">
                <div className="mb-1 text-sm text-agora-muted">{t('approvedAt')}</div>
                <div className="text-sm text-slate-900">
                  {new Date(allocation.approvedAt).toLocaleString()}
                </div>
              </div>
            )}
            {allocation.disbursedAt && (
              <div className="rounded-lg bg-agora-card p-4">
                <div className="mb-1 text-sm text-agora-muted">{t('disbursedAt')}</div>
                <div className="text-sm text-slate-900">
                  {new Date(allocation.disbursedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-agora-card px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-agora-border"
        >
          {t('modals.close')}
        </button>
      </div>
    </div>,
    document.body
  );
}
