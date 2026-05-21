import React, { useEffect, useRef } from 'react';
import { usePlayback } from '../hooks/usePlayback';

interface AudioVisualizerProps {
  barCount?: number;
  barWidth?: number;
  barGap?: number;
  height?: number;
  color?: string;
  className?: string;
}

function generateBarHeights(count: number, isPlaying: boolean): number[] {
  return Array.from({ length: count }, (_, i) => {
    if (!isPlaying) return 0.1 + Math.random() * 0.05;
    // Create a bell-curve-like distribution for a more natural look
    const center = count / 2;
    const distFromCenter = Math.abs(i - center) / center;
    const base = 0.2 + (1 - distFromCenter) * 0.6;
    return base * (0.5 + Math.random() * 0.5);
  });
}

export default function AudioVisualizer({
  barCount = 32,
  barWidth = 4,
  barGap = 2,
  height = 48,
  color = 'var(--accent-color, #1db954)',
  className = '',
}: AudioVisualizerProps) {
  const playback = usePlayback();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [heights, setHeights] = React.useState<number[]>(
    () => generateBarHeights(barCount, playback.isPlaying)
  );

  useEffect(() => {
    if (playback.isPlaying) {
      intervalRef.current = setInterval(() => {
        setHeights(generateBarHeights(barCount, true));
      }, 120);
    } else {
      // Settle to resting state
      setHeights(generateBarHeights(barCount, false));
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playback.isPlaying, barCount]);

  const totalWidth = barCount * barWidth + (barCount - 1) * barGap;

  return (
    <div
      className={`flex items-end justify-center ${className}`}
      style={{ width: totalWidth, height }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="transition-[height,opacity] duration-100 ease-out"
          style={{
            width: barWidth,
            marginRight: i < barCount - 1 ? barGap : 0,
            borderRadius: barWidth / 2,
            backgroundColor: color,
            height: `${Math.max(4, h * height)}px`,
            opacity: playback.isPlaying ? 0.8 + h * 0.2 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

// Spectrum Analyzer variant with frequency bands visual
export function SpectrumAnalyzer({
  barCount = 48,
  barWidth = 3,
  barGap = 1,
  height = 64,
  className = '',
}: Omit<AudioVisualizerProps, 'color'> & { gradientColors?: string[] }) {
  const playback = usePlayback();
  const [heights, setHeights] = React.useState<number[]>(
    () => generateBarHeights(barCount, false)
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playback.isPlaying) {
      intervalRef.current = setInterval(() => {
        setHeights(generateBarHeights(barCount, true));
      }, 100);
    } else {
      setHeights(generateBarHeights(barCount, false));
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playback.isPlaying, barCount]);

  const totalWidth = barCount * barWidth + (barCount - 1) * barGap;

  return (
    <div
      className={`flex items-end justify-center ${className}`}
      style={{ width: totalWidth, height }}
    >
      {heights.map((h, i) => {
        const hue = 140 + (i / barCount) * 60; // Green to yellow-green gradient
        return (
          <div
            key={i}
            className="transition-[height,opacity] duration-100 ease-out"
            style={{
              width: barWidth,
              marginRight: i < barCount - 1 ? barGap : 0,
              borderRadius: barWidth / 2,
              backgroundColor: `hsl(${hue}, 70%, 50%)`,
              height: `${Math.max(3, h * height)}px`,
              opacity: playback.isPlaying ? 0.7 + h * 0.3 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}
