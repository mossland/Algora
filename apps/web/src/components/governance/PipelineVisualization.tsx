'use client';

import { useTranslations } from 'next-intl';
import {
  Radio,
  Search,
  AlertTriangle,
  BookOpen,
  MessageSquare,
  FileText,
  Vote,
  Play,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { type PipelineStage, type PipelineStatus } from '@/lib/api';

interface PipelineVisualizationProps {
  status?: PipelineStatus;
  compact?: boolean;
}

const STAGES: { key: PipelineStage; icon: React.ElementType }[] = [
  { key: 'signal_intake', icon: Radio },
  { key: 'issue_detection', icon: Search },
  { key: 'triage', icon: AlertTriangle },
  { key: 'research', icon: BookOpen },
  { key: 'deliberation', icon: MessageSquare },
  { key: 'decision_packet', icon: FileText },
  { key: 'voting', icon: Vote },
  { key: 'execution', icon: Play },
  { key: 'outcome_verification', icon: CheckCircle },
];

export function PipelineVisualization({ status, compact = false }: PipelineVisualizationProps) {
  const t = useTranslations('Governance.pipeline');

  const getStageStatus = (stage: PipelineStage): 'completed' | 'current' | 'pending' => {
    if (!status) return 'pending';
    if (status.stagesCompleted.includes(stage)) return 'completed';
    if (status.currentStage === stage) return 'current';
    return 'pending';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STAGES.map((stage, index) => {
          const stageStatus = getStageStatus(stage.key);
          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={`h-2 w-2 rounded-full ${
                  stageStatus === 'completed'
                    ? 'bg-agora-success'
                    : stageStatus === 'current'
                      ? 'bg-agora-primary animate-pulse'
                      : 'bg-agora-border'
                }`}
                title={t(`stages.${stage.key}`)}
              />
              {index < STAGES.length - 1 && (
                <div
                  className={`h-0.5 w-2 ${
                    stageStatus === 'completed' ? 'bg-agora-success' : 'bg-agora-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-agora-border bg-agora-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{t('title')}</h3>
        {status && (
          <span className="text-sm text-agora-muted">
            {status.progress}% {t('complete')}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {status && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-agora-border">
          <div
            className="h-full bg-gradient-to-r from-agora-primary to-agora-accent transition-all duration-500"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      )}

      {/* Stages */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const stageStatus = getStageStatus(stage.key);

          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${
                  stageStatus === 'completed'
                    ? 'bg-agora-success/10 text-agora-success'
                    : stageStatus === 'current'
                      ? 'bg-agora-primary/10 text-agora-primary'
                      : 'text-agora-muted'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    stageStatus === 'completed'
                      ? 'bg-agora-success text-white'
                      : stageStatus === 'current'
                        ? 'bg-agora-primary text-slate-900 animate-pulse'
                        : 'bg-agora-border text-agora-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium whitespace-nowrap">
                  {t(`stages.${stage.key}`)}
                </span>
              </div>
              {index < STAGES.length - 1 && (
                <ChevronRight
                  className={`h-4 w-4 mx-1 ${
                    stageStatus === 'completed' ? 'text-agora-success' : 'text-agora-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error display */}
      {status?.error && (
        <div className="mt-4 rounded-lg bg-agora-error/10 p-3 text-sm text-agora-error">
          {status.error}
        </div>
      )}
    </div>
  );
}
