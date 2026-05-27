import React, { useRef, useEffect, useCallback } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { getAnalyser, getSampleRate, startAudioCapture, stopAudioCapture } from '../lib/audioAnalyser';

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

export default function SpectrumAnalyzerCanvas({
  barCount = 64,
  height = 120,
  className = '',
}: SpectrumAnalyzerCanvasProps) {
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

      // Guard against zero-size canvas (flex layout not yet settled)
      if (w < 1 || h < 1) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Resize backing store for DPR; reset transform first so we don't accumulate scales
      const targetWidth = Math.floor(w * dpr);
      const targetHeight = Math.floor(h * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Transparent clear — only the bars are drawn, background shows through
      ctx.clearRect(0, 0, w, h);

      const analyser = getAnalyser();
      let bars: number[];

      if (playback.isPlaying && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        bars = mapFrequencyToBars(dataArray, barCount, getSampleRate());
      } else {
        // Idle animation — gentle sine waves (more visible than before)
        const t = Date.now() / 1000;
        bars = Array.from({ length: barCount }, (_, i) => {
          const phase = i / barCount * Math.PI * 2;
          return 0.12 + 0.2 * Math.abs(Math.sin(t * 0.8 + phase));
        });
      }

      const gap = 2;
      const totalGap = (barCount - 1) * gap;
      const barWidth = Math.max(1, (w - totalGap) / barCount);
      const radius = Math.max(1, barWidth / 2);

      for (let i = 0; i < barCount; i++) {
        const value = bars[i];
        const barH = Math.max(3, value * h * 0.95); // leave a tiny bottom margin
        const x = i * (barWidth + gap);
        const y = h - barH;

        // Gradient: green → yellow → orange → red (based on height)
        const hue = 140 - value * 100; // 140 (green) down to 40 (orange-red)
        const lightness = 45 + value * 25;
        const alpha = 0.6 + value * 0.4;

        ctx.fillStyle = `hsla(${hue}, 80%, ${lightness}%, ${alpha})`;
        drawRoundedTopRect(ctx, x, y, barWidth, barH, radius);
      }
    } catch (err) {
      console.error('[SpectrumAnalyzerCanvas] Draw error:', err);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [playback.isPlaying, barCount, height]);

  // Start display-media audio capture if no analyser is available yet.
  useEffect(() => {
    if (!getAnalyser()) {
      startAudioCapture().catch((e) => {
        console.error('[SpectrumAnalyzerCanvas] startAudioCapture failed:', e);
      });
    }
    return () => {
      // Clean up display media capture when component unmounts
      stopAudioCapture();
    };
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
