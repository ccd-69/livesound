import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';

interface TrackInfo {
  title: string;
  artist: string;
  image?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export default function MiniPlayer() {
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Listen for state updates from main window
    const unsub = window.electronAPI.onMiniPlayerState((state: any) => {
      if (state) {
        setTrack({
          title: state.title || 'Unknown',
          artist: state.artist || 'Unknown Artist',
          image: state.image,
          isPlaying: state.isPlaying,
          currentTime: state.currentTime || 0,
          duration: state.duration || 0,
        });
      }
    });

    return () => {
      unsub();
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // Auto-advance progress when playing
  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (track?.isPlaying) {
      progressInterval.current = setInterval(() => {
        setTrack((prev) => {
          if (!prev) return prev;
          const nextTime = prev.currentTime + 1000;
          return { ...prev, currentTime: nextTime };
        });
      }, 1000);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [track?.isPlaying]);

  const formatTime = (ms: number) => {
    if (!ms || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    window.electronAPI.playPauseMedia?.().catch(() => {});
    setTrack((prev) => (prev ? { ...prev, isPlaying: !prev.isPlaying } : prev));
  };

  const handleNext = () => {
    window.electronAPI.nextMedia?.().catch(() => {});
  };

  const handlePrevious = () => {
    window.electronAPI.previousMedia?.().catch(() => {});
  };

  const handleClose = () => {
    window.electronAPI.closeMiniPlayer?.().catch(() => {});
  };

  const progressPercent = track?.duration > 0
    ? Math.min(100, (track.currentTime / track.duration) * 100)
    : 0;

  return (
    <div className="flex h-screen w-screen select-none items-center overflow-hidden rounded-2xl bg-black/90 text-white backdrop-blur-md">
      {/* Album Art */}
      <div className="relative h-full w-[120px] shrink-0 overflow-hidden">
        {track?.image ? (
          <img
            src={track.image}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/10">
            <span className="text-2xl">🎵</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/90" />
      </div>

      {/* Info & Controls */}
      <div className="flex flex-1 flex-col justify-center px-4 py-3">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-2 top-2 rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>

        {/* Track info */}
        <div className="mb-2 pr-6">
          <p className="truncate text-sm font-semibold leading-tight">{track?.title || 'Not Playing'}</p>
          <p className="truncate text-xs text-white/60">{track?.artist || 'LiveSound'}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] text-white/50 tabular-nums">{formatTime(track?.currentTime || 0)}</span>
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white/80 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-white/50 tabular-nums">{formatTime(track?.duration || 0)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrevious}
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SkipBack size={16} fill="currentColor" />
          </button>

          <button
            onClick={handlePlayPause}
            className="rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
          >
            {track?.isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SkipForward size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
