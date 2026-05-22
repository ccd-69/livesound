import React, { useState, useEffect, useRef } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { useAudioAnalyser } from '../hooks/useAudioAnalyser';
import { getAnalyser } from '../lib/audioAnalyser';

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
    const center = count / 2;
    const distFromCenter = Math.abs(i - center) / center;
    const base = 0.2 + (1 - distFromCenter) * 0.6;
    return base * (0.5 + Math.random() * 0.5);
  });
}

/** Map FFT bins to bars using logarithmic frequency scaling (20 Hz – 20 kHz). */
function mapFrequencyToBarsLog(
  freqData: Uint8Array,
  barCount: number,
  sampleRate: number,
  minFreq = 20,
  maxFreq = 20000
): number[] {
  const nyquist = sampleRate / 2;
  const binCount = freqData.length;
  const freqPerBin = nyquist / binCount;
  const bars: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const fStart = minFreq * Math.pow(maxFreq / minFreq, i / barCount);
    const fEnd = minFreq * Math.pow(maxFreq / minFreq, (i + 1) / barCount);
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

/**
 * Add an 1/8-note rhythmic bounce to the bass bars (low-frequency range).
 * Only affects the first ~30% of bars and only when audio is present.
 */
function addBassVibe(bars: number[], barCount: number): number[] {
  const bassCount = Math.max(2, Math.ceil(barCount * 0.3)); // first 30% = bass guitar range (~20-250 Hz)
  const t = Date.now() / 1000;
  // 1/8 note feel at ~120 BPM: 4 pulses/sec. We add a little swing with two layered sines.
  const beat = 0.6 * Math.abs(Math.sin(t * 5)) + 0.4 * Math.abs(Math.sin(t * 7.5));

  const out = bars.slice();
  for (let i = 0; i < bassCount; i++) {
    if (out[i] > 0.05) {
      // intensity falls off toward the mid-range transition
      const positionWeight = 1 - i / bassCount;
      const vibe = 0.15 + beat * 0.35 * positionWeight;
      out[i] = Math.min(1, out[i] * (1 + vibe));
    }
  }
  return out;
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
  const ready = useAudioAnalyser();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [heights, setHeights] = useState<number[]>(
    () => generateBarHeights(barCount, playback.isPlaying)
  );

  useEffect(() => {
    if (playback.isPlaying) {
      intervalRef.current = setInterval(() => {
        const analyser = getAnalyser();
        if (ready && analyser) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          setHeights(addBassVibe(mapFrequencyToBarsLog(dataArray, barCount, analyser.sampleRate), barCount));
        } else {
          setHeights(generateBarHeights(barCount, true));
        }
      }, 120);
    } else {
      setHeights(generateBarHeights(barCount, false));
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playback.isPlaying, ready, barCount]);

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
  const ready = useAudioAnalyser();
  const [heights, setHeights] = useState<number[]>(
    () => generateBarHeights(barCount, false)
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playback.isPlaying) {
      intervalRef.current = setInterval(() => {
        const analyser = getAnalyser();
        if (ready && analyser) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          setHeights(addBassVibe(mapFrequencyToBarsLog(dataArray, barCount, analyser.sampleRate), barCount));
        } else {
          setHeights(generateBarHeights(barCount, true));
        }
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
  }, [playback.isPlaying, ready, barCount]);

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
