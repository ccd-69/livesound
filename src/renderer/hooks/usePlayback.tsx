import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpotifyPlayer } from './useSpotify';

export interface YoutubeController {
  play: () => void;
  pause: () => void;
}

interface PlaybackState {
  isPlaying: boolean;
  currentTrack: any | null;
  progress: number;
  duration: number;
  volume: number;
  youtubeMode: string;
  youtubeCurrentTrack: any | null;
  isYouTubePlaying: boolean;
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
}

const PlaybackContext = createContext<PlaybackState | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const spotify = useSpotifyPlayer();
  const [volume, setVolumeState] = useState(0.8);
  const [youtubeMode, setYoutubeMode] = useState('iframe');
  const [youtubeCurrentTrack, setYoutubeCurrentTrack] = useState<any | null>(null);
  const [isYouTubePlaying, setIsYouTubePlaying] = useState(false);
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

  const next = useCallback(() => {
    if (youtubeCurrentTrack) {
      stopYouTube();
    }
    spotify.nextTrack();
  }, [spotify, youtubeCurrentTrack, stopYouTube]);

  const previous = useCallback(() => {
    if (youtubeCurrentTrack) {
      stopYouTube();
    }
    spotify.previousTrack();
  }, [spotify, youtubeCurrentTrack, stopYouTube]);

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
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be inside PlaybackProvider');
  return ctx;
}
