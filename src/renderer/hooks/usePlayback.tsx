import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpotifyPlayer } from './useSpotify';

export interface YoutubeController {
  play: () => void;
  pause: () => void;
  seek?: (seconds: number) => void;
}

export type RepeatMode = 'off' | 'loop' | 'loop-single' | 'shuffle';

interface PlaybackState {
  isPlaying: boolean;
  currentTrack: any | null;
  progress: number;
  duration: number;
  volume: number;
  youtubeMode: string;
  youtubeCurrentTrack: any | null;
  isYouTubePlaying: boolean;
  repeatMode: RepeatMode;
  youtubeQueue: any[];
  youtubeQueueIndex: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (ms: number) => void;
  setVolume: (v: number) => void;
  playTrack: (track: any) => void;
  pauseYouTube: () => void;
  stopYouTube: () => void;
  setYoutubeController: (ctrl: YoutubeController | null) => void;
  toggleRepeatMode: () => void;
  setYoutubeQueue: (tracks: any[], index: number) => void;
}

const PlaybackContext = createContext<PlaybackState | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const spotify = useSpotifyPlayer();
  const [volume, setVolumeState] = useState(0.8);
  const [youtubeMode, setYoutubeMode] = useState('iframe');
  const [youtubeCurrentTrack, setYoutubeCurrentTrack] = useState<any | null>(null);
  const [isYouTubePlaying, setIsYouTubePlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [youtubeQueue, setYoutubeQueueState] = useState<any[]>([]);
  const [youtubeQueueIndex, setYoutubeQueueIndex] = useState<number>(0);
  const youtubeControllerRef = useRef<YoutubeController | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then((s: any) => {
      if (s.youtubePlaybackMode) {
        setYoutubeMode(s.youtubePlaybackMode);
      }
    });
  }, []);

  const setYoutubeController = useCallback((ctrl: YoutubeController | null) => {
    youtubeControllerRef.current = ctrl;
  }, []);

  const stopYouTube = useCallback(() => {
    setIsYouTubePlaying(false);
    setYoutubeCurrentTrack(null);
    youtubeControllerRef.current = null;
    window.electronAPI.youtubeDestroyView?.();
  }, []);

  const play = useCallback(() => {
    if (youtubeCurrentTrack) {
      if (youtubeMode === 'ytm-web') {
        window.electronAPI.youtubePlayView?.();
        setIsYouTubePlaying(true);
        return;
      }
      if (youtubeControllerRef.current) {
        youtubeControllerRef.current.play();
        setIsYouTubePlaying(true);
        return;
      }
    }
    if (!spotify.ready) {
      spotify.init();
    } else if (spotify.paused) {
      spotify.togglePlay();
    }
  }, [spotify, youtubeCurrentTrack, youtubeMode]);

  const pause = useCallback(() => {
    if (youtubeCurrentTrack) {
      if (youtubeMode === 'ytm-web') {
        window.electronAPI.youtubePauseView?.();
        setIsYouTubePlaying(false);
        return;
      }
      if (youtubeControllerRef.current) {
        youtubeControllerRef.current.pause();
        setIsYouTubePlaying(false);
        return;
      }
    }
    if (spotify.ready && !spotify.paused) {
      spotify.togglePlay();
    }
  }, [spotify, youtubeCurrentTrack, youtubeMode]);

  const toggle = useCallback(() => {
    if (youtubeCurrentTrack) {
      if (youtubeMode === 'ytm-web') {
        if (isYouTubePlaying) {
          window.electronAPI.youtubePauseView?.();
          setIsYouTubePlaying(false);
        } else {
          window.electronAPI.youtubePlayView?.();
          setIsYouTubePlaying(true);
        }
        return;
      }
      if (youtubeControllerRef.current) {
        if (isYouTubePlaying) {
          youtubeControllerRef.current.pause();
          setIsYouTubePlaying(false);
        } else {
          youtubeControllerRef.current.play();
          setIsYouTubePlaying(true);
        }
        return;
      }
    }
    if (!spotify.ready) {
      spotify.init();
    } else {
      spotify.togglePlay();
    }
  }, [spotify, youtubeCurrentTrack, isYouTubePlaying, youtubeMode]);

  const toggleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      const modes: RepeatMode[] = ['off', 'loop', 'loop-single', 'shuffle'];
      const idx = modes.indexOf(prev);
      return modes[(idx + 1) % modes.length];
    });
  }, []);

  const setYoutubeQueue = useCallback((tracks: any[], index: number) => {
    setYoutubeQueueState(tracks);
    setYoutubeQueueIndex(index);
  }, []);

  const playTrack = useCallback(
    async (track: any) => {
      if (!track) return;

      if (track.source === 'spotify' && track.uri) {
        stopYouTube();
        await spotify.playTrack(track.uri);
      } else if (track.source === 'youtube' && track.uri) {
        if (!spotify.paused) {
          spotify.togglePlay();
        }

        setYoutubeCurrentTrack(track);
        const videoId = track.videoId || track.id;

        switch (youtubeMode) {
          case 'ytm-web': {
            setIsYouTubePlaying(true);
            await window.electronAPI.youtubeCreateView(videoId);
            break;
          }
          case 'direct-stream':
          case 'iframe':
          case 'webview': {
            setIsYouTubePlaying(true);
            navigate('/now-playing');
            break;
          }
          default: {
            await window.electronAPI.openExternal(track.uri);
          }
        }
      }
    },
    [spotify, youtubeMode, stopYouTube]
  );

  const next = useCallback(() => {
    if (youtubeCurrentTrack) {
      if (repeatMode === 'loop-single') {
        if (youtubeControllerRef.current?.seek) {
          youtubeControllerRef.current.seek(0);
          youtubeControllerRef.current.play();
        } else {
          playTrack(youtubeCurrentTrack);
        }
        return;
      }
      if (youtubeQueue.length > 0) {
        let nextIndex: number;
        if (repeatMode === 'shuffle') {
          const candidates = youtubeQueue.map((_, i) => i).filter((i) => i !== youtubeQueueIndex);
          nextIndex = candidates.length === 0 ? 0 : candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          nextIndex = youtubeQueueIndex + 1;
          if (nextIndex >= youtubeQueue.length) {
            if (repeatMode === 'loop') {
              nextIndex = 0;
            } else {
              stopYouTube();
              spotify.nextTrack();
              return;
            }
          }
        }
        setYoutubeQueueIndex(nextIndex);
        playTrack(youtubeQueue[nextIndex]);
        return;
      }
      stopYouTube();
    }
    spotify.nextTrack();
  }, [spotify, youtubeCurrentTrack, youtubeQueue, youtubeQueueIndex, repeatMode, stopYouTube, playTrack]);

  const previous = useCallback(() => {
    if (youtubeCurrentTrack) {
      if (repeatMode === 'loop-single') {
        if (youtubeControllerRef.current?.seek) {
          youtubeControllerRef.current.seek(0);
          youtubeControllerRef.current.play();
        } else {
          playTrack(youtubeCurrentTrack);
        }
        return;
      }
      if (youtubeQueue.length > 0) {
        let prevIndex: number;
        if (repeatMode === 'shuffle') {
          const candidates = youtubeQueue.map((_, i) => i).filter((i) => i !== youtubeQueueIndex);
          prevIndex = candidates.length === 0 ? 0 : candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          prevIndex = youtubeQueueIndex - 1;
          if (prevIndex < 0) {
            if (repeatMode === 'loop') {
              prevIndex = youtubeQueue.length - 1;
            } else {
              stopYouTube();
              spotify.previousTrack();
              return;
            }
          }
        }
        setYoutubeQueueIndex(prevIndex);
        playTrack(youtubeQueue[prevIndex]);
        return;
      }
      stopYouTube();
    }
    spotify.previousTrack();
  }, [spotify, youtubeCurrentTrack, youtubeQueue, youtubeQueueIndex, repeatMode, stopYouTube, playTrack]);

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

  const pauseYouTube = useCallback(() => {
    if (youtubeControllerRef.current) {
      youtubeControllerRef.current.pause();
    }
    setIsYouTubePlaying(false);
  }, []);

  // Keep refs to the latest callbacks so media-key subscriptions don't stale-close
  const callbacksRef = useRef({ play, pause, toggle, next, previous });
  callbacksRef.current = { play, pause, toggle, next, previous };

  useEffect(() => {
    const unsubPlayPause = window.electronAPI.onMediaPlayPause(() => {
      callbacksRef.current.toggle();
    });
    const unsubNext = window.electronAPI.onMediaNext(() => {
      callbacksRef.current.next();
    });
    const unsubPrev = window.electronAPI.onMediaPrevious(() => {
      callbacksRef.current.previous();
    });

    return () => {
      unsubPlayPause();
      unsubNext();
      unsubPrev();
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          callbacksRef.current.toggle();
          break;
        case 'ArrowRight':
          e.preventDefault();
          callbacksRef.current.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          callbacksRef.current.previous();
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

  const isSpotifyPlaying = !spotify.paused && !!spotify.currentTrack;
  const activeTrack = isSpotifyPlaying ? spotify.currentTrack : (youtubeCurrentTrack || spotify.currentTrack);

  const value: PlaybackState = {
    isPlaying: isSpotifyPlaying || isYouTubePlaying,
    currentTrack: activeTrack,
    progress: isSpotifyPlaying ? spotify.position : 0,
    duration: isSpotifyPlaying ? spotify.duration : 0,
    volume,
    youtubeMode,
    youtubeCurrentTrack,
    isYouTubePlaying,
    repeatMode,
    youtubeQueue,
    youtubeQueueIndex,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    playTrack,
    pauseYouTube,
    stopYouTube,
    setYoutubeController,
    toggleRepeatMode,
    setYoutubeQueue,
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be inside PlaybackProvider');
  return ctx;
}
