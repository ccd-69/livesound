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
    return 0.15 + 0.25 * Math.abs(Math.sin(t * 0.6 + phase));
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

/** Draw a rounded-top rect manually (safe fallback for older Chromium). */
function drawRoundedTopRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
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
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (w < 1 || h < 1) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const targetWidth = Math.floor(w * dpr);
      const targetHeight = Math.floor(h * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
      const barWidth = Math.max(1, (w - totalGap) / barCount);
      const radius = Math.max(1, barWidth / 2);

      for (let i = 0; i < barCount; i++) {
        const value = bars[i];
        const barH = Math.max(3, value * h * 0.95);
        const x = i * (barWidth + gap);
        const y = h - barH;

        ctx.fillStyle = 'var(--accent-color, #1db954)';
        drawRoundedTopRect(ctx, x, y, barWidth, barH, radius);
      }
    } catch (err) {
      console.error('[EqualizerCanvas] Draw error:', err);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [playback.isPlaying, barCount, height]);

  useEffect(() => {
    if (!getAnalyser()) {
      startAudioCapture().catch((e) => {
        console.error('[EqualizerCanvas] startAudioCapture failed:', e);
      });
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
