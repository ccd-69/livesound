import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Music } from 'lucide-react';

interface TrackInfo {
  title: string;
  artist: string;
  image?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  source: string;
  uri: string;
  videoId: string;
}

export default function MiniPlayer() {
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Listen for state updates from main window
  useEffect(() => {
    const unsub = window.electronAPI.onMiniPlayerState((state: any) => {
      if (state) {
        setTrack({
          title: state.title || 'Unknown',
          artist: state.artist || 'Unknown Artist',
          image: state.image,
          isPlaying: state.isPlaying,
          currentTime: state.currentTime || 0,
          duration: state.duration || 0,
          source: state.source || '',
          uri: state.uri || '',
          videoId: state.videoId || '',
        });
      }
    });
    return () => unsub();
  }, []);

  // Fetch stream URL for YouTube tracks
  useEffect(() => {
    if (!track || track.source !== 'youtube' || !track.uri) {
      setStreamUrl('');
      return;
    }
    let cancelled = false;
    setStreamLoading(true);
    window.electronAPI.youtubeGetStreamUrl(track.uri).then((result: any) => {
      if (cancelled) return;
      if (result.success && result.url) {
        setStreamUrl(result.url);
      } else {
        setStreamUrl('');
      }
      setStreamLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setStreamUrl('');
        setStreamLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [track?.uri, track?.source]);

  // Sync video element play/pause with track state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    if (track?.isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!track?.isPlaying && !video.paused) {
      video.pause();
    }
  }, [track?.isPlaying, streamUrl]);

  const handlePlayPause = () => {
    window.electronAPI.playPauseMedia?.().catch(() => {});
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

  const formatTime = (ms: number) => {
    if (!ms || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hasTrack = !!track && !!track.title && track.title !== 'Unknown';
  const isYouTube = hasTrack && track.source === 'youtube';
  const showVideo = isYouTube && streamUrl && !streamLoading;

  return (
    <div
      className="flex h-screen w-screen select-none flex-col overflow-hidden rounded-2xl bg-[#121212] text-white"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Video / Album Art Area */}
      <div className="relative flex-1 overflow-hidden">
        {showVideo ? (
          <video
            ref={videoRef}
            src={streamUrl}
            muted
            playsInline
            className="h-full w-full object-cover"
            onPlay={() => { /* synced via effect */ }}
            onPause={() => { /* synced via effect */ }}
          />
        ) : hasTrack && track.image ? (
          <img
            src={track.image}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#121212]">
            <div className="flex flex-col items-center gap-2 text-white/20">
              <Music size={40} />
              <span className="text-xs font-medium">LiveSound</span>
            </div>
          </div>
        )}

        {/* Dark gradient overlay for controls readability */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Controls Area */}
      <div className="relative z-10 flex flex-col gap-2 px-4 pb-3 pt-1">
        {/* Track info */}
        <div className="text-center">
          <p className="truncate text-sm font-semibold leading-tight">
            {hasTrack ? track.title : 'Not Playing'}
          </p>
          <p className="truncate text-xs text-white/50">
            {hasTrack ? track.artist : 'LiveSound'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 tabular-nums">{formatTime(track?.currentTime || 0)}</span>
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-white/40 tabular-nums">{formatTime(track?.duration || 0)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={handlePrevious}
            className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            <SkipBack size={18} fill="currentColor" />
          </button>

          <button
            onClick={handlePlayPause}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-black transition-transform hover:scale-105 active:scale-95"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            {track?.isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="rounded-full p-1.5 text-white/60 transition-colors hover:text-white"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
