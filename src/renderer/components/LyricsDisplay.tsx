import React, { useEffect, useState, useRef } from 'react';
import { Mic2 } from 'lucide-react';
import { fetchLyrics, LyricsResult } from '../lib/lyrics';

interface LyricsDisplayProps {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  currentTime: number;
  isPlaying: boolean;
}

export default function LyricsDisplay({
  trackName,
  artistName,
  albumName,
  duration,
  currentTime,
  isPlaying,
}: LyricsDisplayProps) {
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeLine, setActiveLine] = useState(-1);
  const [showLyrics, setShowLyrics] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!trackName || !artistName) {
      setLyrics(null);
      setActiveLine(-1);
      return;
    }

    setLoading(true);
    setError('');
    setLyrics(null);
    setActiveLine(-1);

    fetchLyrics(trackName, artistName, albumName, duration)
      .then((result) => {
        setLyrics(result);
        if (result.syncType === 'not-found') {
          setError('No lyrics found for this track');
        }
      })
      .catch((err) => {
        setError('Failed to load lyrics');
        console.warn('[LyricsDisplay]', err);
      })
      .finally(() => setLoading(false));
  }, [trackName, artistName, albumName, duration]);

  // Highlight current line based on playback time
  useEffect(() => {
    if (!lyrics || lyrics.syncType !== 'line-synced') return;

    const idx = lyrics.lines.findIndex((line, i) => {
      const nextLine = lyrics.lines[i + 1];
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });

    if (idx !== -1 && idx !== activeLine) {
      setActiveLine(idx);
    }
  }, [currentTime, lyrics, activeLine]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLine < 0 || !containerRef.current) return;
    const lineEl = lineRefs.current[activeLine];
    if (!lineEl) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const lineRect = lineEl.getBoundingClientRect();
    const lineTop = lineRect.top - containerRect.top + container.scrollTop;
    const targetScroll = lineTop - containerRect.height / 2 + lineRect.height / 2;

    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
  }, [activeLine]);

  if (!trackName || !artistName) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted">
        <Mic2 size={24} className="animate-pulse" />
        <span className="text-sm">Loading lyrics...</span>
      </div>
    );
  }

  if (error || !lyrics || lyrics.syncType === 'not-found') {
    return null;
  }

  return (
    <div className="w-full max-w-lg">
      {/* Toggle button */}
      <button
        onClick={() => setShowLyrics(!showLyrics)}
        className="mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/10"
      >
        <Mic2 size={16} />
        {showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
      </button>

      {showLyrics && (
        <div
          ref={containerRef}
          className="max-h-[300px] overflow-y-auto rounded-xl bg-white/5 px-4 py-4 scrollbar-thin"
        >
          <div className="flex flex-col gap-3">
            {lyrics.lines.map((line, i) => (
              <div
                key={`${line.time}-${i}`}
                ref={(el) => { lineRefs.current[i] = el; }}
                className={`text-center transition-all duration-500 ${
                  i === activeLine
                    ? 'scale-105 text-lg font-semibold text-text'
                    : i < activeLine
                    ? 'text-sm text-white/30'
                    : 'text-sm text-white/50'
                }`}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
