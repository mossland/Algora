'use client';

import { FileText, Briefcase, Code, Megaphone, Shield, Cog } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface BudgetAllocation {
  id: string;
  proposalId: string;
  category: string;
  tokenSymbol: string;
  amount: string;
  recipient: string;
  status: 'pending' | 'approved' | 'disbursed' | 'cancelled';
  description: string;
  createdAt: string;
  approvedAt?: string;
  disbursedAt?: string;
  txHash?: string;
}

interface AllocationCardProps {
  allocation: BudgetAllocation;
  onClick?: () => void;
  index?: number;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  operations: Cog,
  development: Code,
  marketing: Megaphone,
  security: Shield,
  business: Briefcase,
  default: FileText,
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-400',
  disbursed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

export function AllocationCard({ allocation, onClick, index = 0 }: AllocationCardProps) {
  const t = useTranslations('Treasury');

  const formatBalance = (balance: string, decimals: number = 18) => {
    const value = BigInt(balance) / BigInt(10 ** decimals);
    return value.toLocaleString();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const Icon = categoryIcons[allocation.category.toLowerCase()] || categoryIcons.default;

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg border border-agora-border bg-agora-card p-4 transition-all hover:border-agora-accent/50 hover:shadow-md ${onClick ? 'cursor-pointer' : ''} animate-slide-up`}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-agora-accent/20">
          <Icon className="h-5 w-5 text-agora-accent" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{allocation.category}</p>
          <p className="text-sm text-agora-muted">{allocation.description}</p>
          <p className="mt-1 font-mono text-xs text-agora-muted">
            {t('recipient')}: {formatAddress(allocation.recipient)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-900">
          {formatBalance(allocation.amount)} {allocation.tokenSymbol}
        </p>
        <span
          className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[allocation.status]}`}
        >
          {t(`allocation.${allocation.status}`)}
        </span>
        <p className="mt-1 text-xs text-agora-muted">
          {new Date(allocation.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
