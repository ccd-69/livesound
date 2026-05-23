import React, { useRef, useEffect, useCallback } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { getAnalyser, getSampleRate } from '../lib/audioAnalyser';

interface SpectrumAnalyzerCanvasProps {
  barCount?: number;
  height?: number;
  className?: string;
}

function mapFrequencyToBars(
  freqData: Uint8Array,
  barCount: number,
  sampleRate: number
): number[] {
  const nyquist = sampleRate / 2;
  const binCount = freqData.length;
  const freqPerBin = nyquist / binCount;
  const bars: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const fStart = 20 * Math.pow(20000 / 20, i / barCount);
    const fEnd = 20 * Math.pow(20000 / 20, (i + 1) / barCount);
    const binStart = Math.max(0, Math.floor(fStart / freqPerBin));
    const binEnd = Math.min(binCount, Math.floor(fEnd / freqPerBin));

    let sum = 0;
    let count = 0;
    for (let b = binStart; b < binEnd; b++) {
      sum += freqData[b];
      count++;
    }
    bars.push(count > 0 ? sum / count / 255 : 0);
  }
  return bars;
}

export default function SpectrumAnalyzerCanvas({
  barCount = 64,
  height = 120,
  className = '',
}: SpectrumAnalyzerCanvasProps) {
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

    // Resize canvas for DPR
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    const analyser = getAnalyser();
    let bars: number[];

    if (playback.isPlaying && analyser) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      bars = mapFrequencyToBars(dataArray, barCount, getSampleRate());
    } else {
      // Idle animation — gentle sine waves
      const t = Date.now() / 1000;
      bars = Array.from({ length: barCount }, (_, i) => {
        const phase = i / barCount * Math.PI * 2;
        return 0.05 + 0.08 * Math.abs(Math.sin(t * 0.8 + phase));
      });
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

      // Gradient: green → yellow → orange → red (based on height)
      const hue = 140 - value * 100; // 140 (green) down to 40 (orange-red)
      const lightness = 45 + value * 25;
      const alpha = 0.5 + value * 0.5;

      ctx.fillStyle = `hsla(${hue}, 80%, ${lightness}%, ${alpha})`;

      // Draw rounded rect
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [radius, radius, 0, 0]);
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [playback.isPlaying, barCount, height]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height }}
    />
  );
}
