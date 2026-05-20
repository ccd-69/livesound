import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSpotifyPlayer } from './useSpotify';

interface PlaybackState {
  isPlaying: boolean;
  currentTrack: any | null;
  progress: number;
  duration: number;
  volume: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (ms: number) => void;
  setVolume: (v: number) => void;
  playTrack: (track: any) => void;
}

const PlaybackContext = createContext<PlaybackState | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const spotify = useSpotifyPlayer();
  const [volume, setVolumeState] = useState(0.8);

  useEffect(() => {
    const unsubPlayPause = window.electronAPI.onMediaPlayPause(() => {
      spotify.togglePlay();
    });
    const unsubNext = window.electronAPI.onMediaNext(() => {
      spotify.nextTrack();
    });
    const unsubPrev = window.electronAPI.onMediaPrevious(() => {
      spotify.previousTrack();
    });

    return () => {
      unsubPlayPause();
      unsubNext();
      unsubPrev();
    };
  }, [spotify]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          spotify.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          spotify.nextTrack();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          spotify.previousTrack();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolumeState((v) => {
            const next = Math.min(1, v + 0.05);
            spotify.setVolume(next);
            return next;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolumeState((v) => {
            const next = Math.max(0, v - 0.05);
            spotify.setVolume(next);
            return next;
          });
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spotify]);

  const play = useCallback(() => {
    if (!spotify.ready) {
      spotify.init();
    } else if (spotify.paused) {
      spotify.togglePlay();
    }
  }, [spotify]);

  const pause = useCallback(() => {
    if (spotify.ready && !spotify.paused) {
      spotify.togglePlay();
    }
  }, [spotify]);

  const toggle = useCallback(() => {
    if (!spotify.ready) {
      spotify.init();
    } else {
      spotify.togglePlay();
    }
  }, [spotify]);

  const next = useCallback(() => spotify.nextTrack(), [spotify]);
  const previous = useCallback(() => spotify.previousTrack(), [spotify]);

  const seek = useCallback(
    (ms: number) => {
      spotify.seek(ms);
    },
    [spotify]
  );

  const setVolume = useCallback(
    (v: number) => {
      setVolumeState(v);
      spotify.setVolume(v);
    },
    [spotify]
  );

  const playTrack = useCallback(
    async (track: any) => {
      if (!track) return;

      if (track.source === 'spotify' && track.uri) {
        await spotify.playTrack(track.uri);
      } else if (track.source === 'youtube' && track.uri) {
        // Open YouTube Music in default browser since there's no in-app playback SDK
        await window.electronAPI.openExternal(track.uri);
      }
    },
    [spotify]
  );

  const value: PlaybackState = {
    isPlaying: !spotify.paused && !!spotify.currentTrack,
    currentTrack: spotify.currentTrack,
    progress: spotify.position,
    duration: spotify.duration,
    volume,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    playTrack,
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be inside PlaybackProvider');
  return ctx;
}
