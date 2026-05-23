import React, { useRef, useEffect, useCallback } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { getAnalyser, startAudioCapture } from '../lib/audioAnalyser';

interface EqualizerCanvasProps {
  barCount?: number;
  height?: number;
  className?: string;
}

function generateIdleBars(count: number, t: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const phase = i / count * Math.PI * 2;
    return 0.1 + 0.15 * Math.abs(Math.sin(t * 0.6 + phase));
  });
}

function mapFreqToBars(freqData: Uint8Array, barCount: number): number[] {
  const binCount = freqData.length;
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const start = Math.floor((i / barCount) * binCount * 0.5);
    const end = Math.floor(((i + 1) / barCount) * binCount * 0.5);
    let sum = 0;
    for (let b = start; b < end; b++) sum += freqData[b];
    bars.push(sum / ((end - start) * 255));
  }
  return bars;
}

export default function EqualizerCanvas({
  barCount = 24,
  height = 32,
  className = '',
}: EqualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const playback = usePlayback();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    const analyser = getAnalyser();
    let bars: number[];

    if (playback.isPlaying && analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      bars = mapFreqToBars(data, barCount);
    } else {
      bars = generateIdleBars(barCount, Date.now() / 1000);
    }

    const gap = 2;
    const totalGap = (barCount - 1) * gap;
    const barWidth = (w - totalGap) / barCount;
    const radius = barWidth / 2;

    for (let i = 0; i < barCount; i++) {
      const value = bars[i];
      const barH = Math.max(2, value * h);
      const x = i * (barWidth + gap);
      const y = h - barH;

      ctx.fillStyle = 'var(--accent-color, #1db954)';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [radius, radius, 0, 0]);
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [playback.isPlaying, barCount, height]);

  useEffect(() => {
    if (!getAnalyser()) {
      startAudioCapture().catch(() => {});
    }
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`${className}`}
      style={{ width: barCount * 5 + (barCount - 1) * 2, height }}
    />
  );
}
