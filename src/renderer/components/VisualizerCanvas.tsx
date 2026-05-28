import React, { useRef, useEffect, useCallback } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { getAnalyser, getSampleRate, initEngine } from '../audio/engine';

export type VisualizerMode = 'spectrum' | 'circular' | 'waveform';

interface VisualizerCanvasProps {
  mode?: VisualizerMode;
  barCount?: number;
  height?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

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

function setupCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): { w: number; h: number; dpr: number } {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  if (w < 1 || h < 1) return { w: 0, h: 0, dpr };

  const tw = Math.floor(w * dpr);
  const th = Math.floor(h * dpr);
  if (canvas.width !== tw || canvas.height !== th) {
    canvas.width = tw;
    canvas.height = th;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { w, h, dpr };
}

/* ------------------------------------------------------------------ */
/* Spectrum mode (logarithmic bars)                                   */
/* ------------------------------------------------------------------ */

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

function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  barCount: number,
  isPlaying: boolean,
  analyser: AnalyserNode | null
) {
  let bars: number[];

  if (isPlaying && analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    bars = mapFrequencyToBars(dataArray, barCount, getSampleRate());
  } else {
    const t = Date.now() / 1000;
    bars = Array.from({ length: barCount }, (_, i) => {
      const phase = (i / barCount) * Math.PI * 2;
      return 0.12 + 0.2 * Math.abs(Math.sin(t * 0.8 + phase));
    });
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

    const hue = 140 - value * 100;
    const lightness = 45 + value * 25;
    const alpha = 0.6 + value * 0.4;

    ctx.fillStyle = `hsla(${hue}, 80%, ${lightness}%, ${alpha})`;
    drawRoundedTopRect(ctx, x, y, barWidth, barH, radius);
  }
}

/* ------------------------------------------------------------------ */
/* Circular mode (radial bars)                                        */
/* ------------------------------------------------------------------ */

function drawCircular(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  barCount: number,
  isPlaying: boolean,
  analyser: AnalyserNode | null
) {
  const cx = w / 2;
  const cy = h / 2;
  const innerR = Math.min(w, h) * 0.22;
  const maxBarLen = Math.min(w, h) * 0.38;

  let bars: number[];

  if (isPlaying && analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    bars = mapFrequencyToBars(dataArray, barCount, getSampleRate());
  } else {
    const t = Date.now() / 1000;
    bars = Array.from({ length: barCount }, (_, i) => {
      const phase = (i / barCount) * Math.PI * 2;
      return 0.12 + 0.25 * Math.abs(Math.sin(t * 0.6 + phase));
    });
  }

  const slice = (Math.PI * 2) / barCount;
  const barWidth = Math.max(2, (Math.PI * 2 * innerR) / barCount * 0.6);

  for (let i = 0; i < barCount; i++) {
    const value = bars[i];
    const barLen = value * maxBarLen;
    const angle = i * slice - Math.PI / 2;

    const hue = 140 - value * 100;
    const lightness = 45 + value * 25;
    const alpha = 0.6 + value * 0.4;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = `hsla(${hue}, 80%, ${lightness}%, ${alpha})`;
    // Draw bar extending outward along local +x from innerR
    (ctx as any).roundRect(innerR, -barWidth / 2, barLen, barWidth, barWidth / 2);
    ctx.fill();
    ctx.restore();
  }

  // Inner glow ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'hsla(140, 80%, 50%, 0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Waveform mode (time-domain oscilloscope)                           */
/* ------------------------------------------------------------------ */

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isPlaying: boolean,
  analyser: AnalyserNode | null
) {
  const cx = w / 2;
  const cy = h / 2;
  const amplitude = h * 0.4;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isPlaying && analyser) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.beginPath();
    const sliceWidth = w / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = cy + (v - 1) * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.strokeStyle = 'var(--accent-color, #1db954)';
    ctx.stroke();

    // Glow
    ctx.shadowColor = 'var(--accent-color, #1db954)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    // Idle sine wave
    const t = Date.now() / 1000;
    ctx.beginPath();
    for (let x = 0; x < w; x += 2) {
      const y =
        cy +
        Math.sin((x / w) * Math.PI * 4 + t * 1.5) * amplitude * 0.3 +
        Math.sin((x / w) * Math.PI * 2 - t) * amplitude * 0.15;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'hsla(140, 80%, 50%, 0.4)';
    ctx.stroke();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function VisualizerCanvas({
  mode = 'spectrum',
  barCount = 64,
  height = 120,
  className = '',
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const playback = usePlayback();

  const draw = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { w, h } = setupCanvas(canvas, ctx);
      if (w === 0 || h === 0) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const analyser = getAnalyser();

      switch (mode) {
        case 'spectrum':
          drawSpectrum(ctx, w, h, barCount, playback.isPlaying, analyser);
          break;
        case 'circular':
          drawCircular(ctx, w, h, barCount, playback.isPlaying, analyser);
          break;
        case 'waveform':
          drawWaveform(ctx, w, h, playback.isPlaying, analyser);
          break;
      }
    } catch (err) {
      console.error('[VisualizerCanvas] Draw error:', err);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [playback.isPlaying, barCount, height, mode]);

  useEffect(() => {
    if (!getAnalyser()) {
      initEngine().catch((e) => {
        console.error('[VisualizerCanvas] initEngine failed:', e);
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
      className={`w-full min-w-[200px] ${className}`}
      style={{ height, background: 'transparent' }}
    />
  );
}
