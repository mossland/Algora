'use client';

interface ASCIIProgressBarProps {
  progress: number; // 0-100
  width?: number; // character count
  showPercentage?: boolean;
  label?: string;
  variant?: 'default' | 'gradient' | 'segments';
  className?: string;
}

// Block characters for different fill levels
const BLOCKS = {
  full: '█',
  threequarter: '▓',
  half: '▒',
  quarter: '░',
  empty: '░',
};

export function ASCIIProgressBar({
  progress,
  width = 20,
  showPercentage = true,
  label,
  variant = 'default',
  className = '',
}: ASCIIProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const filledCount = Math.round((clampedProgress / 100) * width);
  const emptyCount = width - filledCount;

  const renderBar = () => {
    switch (variant) {
      case 'gradient':
        // Use different density blocks for gradient effect
        return (
          <>
            <span className="ascii-progress-filled">
              {BLOCKS.full.repeat(Math.max(0, filledCount - 2))}
              {filledCount > 1 ? BLOCKS.threequarter : ''}
              {filledCount > 0 ? BLOCKS.half : ''}
            </span>
            <span className="ascii-progress-empty">
              {BLOCKS.empty.repeat(emptyCount)}
            </span>
          </>
        );

      case 'segments': {
        // Segmented bar with separators
        const segmentCount = 10;
        const filledSegments = Math.round((clampedProgress / 100) * segmentCount);
        return (
          <>
            {Array.from({ length: segmentCount }).map((_, i) => (
              <span
                key={i}
                className={i < filledSegments ? 'ascii-progress-filled' : 'ascii-progress-empty'}
              >
                {i < filledSegments ? '██' : '░░'}
              </span>
            ))}
          </>
        );
      }

      default:
        return (
          <>
            <span className="ascii-progress-filled">
              {BLOCKS.full.repeat(filledCount)}
            </span>
            <span className="ascii-progress-empty">
              {BLOCKS.empty.repeat(emptyCount)}
            </span>
          </>
        );
    }
  };

  return (
    <span className={`font-terminal text-sm inline-flex items-center gap-2 ${className}`}>
      {label && <span className="text-slate-600">{label}:</span>}
      <span className="ascii-border">[</span>
      {renderBar()}
      <span className="ascii-border">]</span>
      {showPercentage && (
        <span className="text-slate-600 w-12 text-right">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </span>
  );
}

// Vertical progress bar
interface ASCIIVerticalProgressProps {
  progress: number;
  height?: number;
  showPercentage?: boolean;
  className?: string;
}

export function ASCIIVerticalProgress({
  progress,
  height = 10,
  showPercentage = false,
  className = '',
}: ASCIIVerticalProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const filledCount = Math.round((clampedProgress / 100) * height);

  return (
    <div className={`font-terminal text-sm ${className}`}>
      {showPercentage && (
        <div className="text-center text-slate-600 mb-1">{Math.round(clampedProgress)}%</div>
      )}
      <div className="flex flex-col-reverse">
        {Array.from({ length: height }).map((_, i) => (
          <div
            key={i}
            className={i < filledCount ? 'ascii-progress-filled' : 'ascii-progress-empty'}
          >
            {i < filledCount ? '██' : '░░'}
          </div>
        ))}
      </div>
    </div>
  );
}
