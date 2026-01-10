'use client';

import { ReactNode } from 'react';

interface CRTOverlayProps {
  children: ReactNode;
  intensity?: 'subtle' | 'medium' | 'strong';
  scanlines?: boolean;
  flicker?: boolean;
  className?: string;
}

export function CRTOverlay({
  children,
  intensity = 'subtle',
  scanlines = true,
  flicker = false,
  className = '',
}: CRTOverlayProps) {
  const intensityStyles = {
    subtle: {
      scanlineOpacity: 0.03,
      glowOpacity: 0.02,
    },
    medium: {
      scanlineOpacity: 0.05,
      glowOpacity: 0.04,
    },
    strong: {
      scanlineOpacity: 0.08,
      glowOpacity: 0.06,
    },
  };

  const style = intensityStyles[intensity];

  return (
    <div className={`relative ${className}`}>
      {/* Main content */}
      <div className={`relative z-0 ${flicker ? 'animate-crt-flicker' : ''}`}>
        {children}
      </div>

      {/* Scanlines overlay */}
      {scanlines && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, ${style.scanlineOpacity}) 0px,
              rgba(0, 0, 0, ${style.scanlineOpacity}) 1px,
              transparent 1px,
              transparent 2px
            )`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Subtle vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 60%,
            rgba(0, 0, 0, ${style.glowOpacity}) 100%
          )`,
        }}
        aria-hidden="true"
      />

      {/* Optional screen curvature effect at corners */}
      <div
        className="absolute inset-0 pointer-events-none z-10 rounded-lg"
        style={{
          boxShadow: `inset 0 0 60px rgba(22, 246, 171, ${style.glowOpacity})`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// Simple scanline component for smaller areas
interface ScanlineOverlayProps {
  className?: string;
}

export function ScanlineOverlay({ className = '' }: ScanlineOverlayProps) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.03) 0px,
          rgba(0, 0, 0, 0.03) 1px,
          transparent 1px,
          transparent 2px
        )`,
      }}
      aria-hidden="true"
    />
  );
}
