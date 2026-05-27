import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpotifyPlayer } from './useSpotify';

/* ------------------------------------------------------------------ */
/* Media Session helpers                                               */
/* ------------------------------------------------------------------ */

function getTrackImage(track: any): { src: string; sizes?: string; type?: string }[] {
  if (!track) return [];
  const url =
    track.album?.images?.[0]?.url ||
    track.image ||
    track.thumbnail ||
    track.album?.images?.[1]?.url ||
    '';
  return url ? [{ src: url, sizes: '512x512', type: 'image/jpeg' }] : [];
}

function getTrackTitle(track: any): string {
  return track?.name || track?.title || 'Unknown Title';
}

function getTrackArtist(track: any): string {
  if (track?.artists) {
    return track.artists.map((a: any) => a.name).join(', ');
  }
  return track?.artist || track?.channelTitle || 'Unknown Artist';
}

function getTrackAlbum(track: any): string {
  return track?.album?.name || track?.album || '';
}

function updateMediaSession(
  track: any,
  isPlaying: boolean,
  handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSeek: (details: MediaSessionActionDetails) => void;
  }
) {
  if (!('mediaSession' in navigator)) {
    console.warn('[MediaSession] API not supported in this browser');
    return;
  }

  const ms = navigator.mediaSession;

  ms.metadata = new MediaMetadata({
    title: getTrackTitle(track),
    artist: getTrackArtist(track),
    album: getTrackAlbum(track),
    artwork: getTrackImage(track),
  });

  ms.playbackState = isPlaying ? 'playing' : 'paused';

  ms.setActionHandler('play', handlers.onPlay);
  ms.setActionHandler('pause', handlers.onPause);
  ms.setActionHandler('nexttrack', handlers.onNext);
  ms.setActionHandler('previoustrack', handlers.onPrevious);
  ms.setActionHandler('seekto', handlers.onSeek);
  ms.setActionHandler('seekbackward', (details) => {
    handlers.onSeek({
      ...details,
      seekTime: (details.seekOffset ?? 10) * -1,
      fastSeek: false,
    } as MediaSessionActionDetails);
  });
  ms.setActionHandler('seekforward', (details) => {
    handlers.onSeek({
      ...details,
      seekTime: details.seekOffset ?? 10,
      fastSeek: false,
    } as MediaSessionActionDetails);
  });

  console.log('[MediaSession] Updated:', getTrackTitle(track), '-', getTrackArtist(track), isPlaying ? '(playing)' : '(paused)');
}

function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = 'none';
}

/* ------------------------------------------------------------------ */

export interface YoutubeController {
  play: () => void;
  pause: () => void;
  seek?: (seconds: number) => void;
  getTime?: () => { currentTime: number; duration: number } | null | Promise<{ currentTime: number; duration: number } | null>;
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
  soundcloudCurrentTrack: any | null;
  isSoundCloudPlaying: boolean;
  repeatMode: RepeatMode;
  youtubeQueue: any[];
  youtubeQueueIndex: number;
  autoplayEnabled: boolean;
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
  setAutoplayEnabled: (v: boolean) => void;
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
  const [youtubeProgress, setYoutubeProgress] = useState<number>(0);
  const [youtubeDuration, setYoutubeDuration] = useState<number>(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const youtubeControllerRef = useRef<YoutubeController | null>(null);
  const relatedTracksRef = useRef<any[]>([]);
  const relatedIndexRef = useRef(0);

  // SoundCloud audio playback
  const [soundcloudCurrentTrack, setSoundcloudCurrentTrack] = useState<any | null>(null);
  const [isSoundCloudPlaying, setIsSoundCloudPlaying] = useState(false);
  const [soundcloudProgress, setSoundcloudProgress] = useState(0);
  const [soundcloudDuration, setSoundcloudDuration] = useState(0);
  const soundcloudAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then((s: any) => {
      if (s.youtubePlaybackMode) {
        setYoutubeMode(s.youtubePlaybackMode);
      }
      setAutoplayEnabled(s.autoplayRelated ?? false);
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

  const stopSoundCloud = useCallback(() => {
    setIsSoundCloudPlaying(false);
    setSoundcloudCurrentTrack(null);
    setSoundcloudProgress(0);
    setSoundcloudDuration(0);
    if (soundcloudAudioRef.current) {
      soundcloudAudioRef.current.pause();
      soundcloudAudioRef.current.src = '';
    }
  }, []);

  const play = useCallback(() => {
    if (soundcloudCurrentTrack && soundcloudAudioRef.current) {
      soundcloudAudioRef.current.play().catch(() => {});
      setIsSoundCloudPlaying(true);
      return;
    }
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
  }, [spotify, youtubeCurrentTrack, youtubeMode, soundcloudCurrentTrack]);

  const pause = useCallback(() => {
    if (soundcloudCurrentTrack && soundcloudAudioRef.current) {
      soundcloudAudioRef.current.pause();
      setIsSoundCloudPlaying(false);
      return;
    }
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
  }, [spotify, youtubeCurrentTrack, youtubeMode, soundcloudCurrentTrack]);

  const toggle = useCallback(() => {
    if (soundcloudCurrentTrack) {
      if (isSoundCloudPlaying) {
        soundcloudAudioRef.current?.pause();
        setIsSoundCloudPlaying(false);
      } else {
        soundcloudAudioRef.current?.play().catch(() => {});
        setIsSoundCloudPlaying(true);
      }
      return;
    }
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
  }, [spotify, youtubeCurrentTrack, isYouTubePlaying, youtubeMode, soundcloudCurrentTrack, isSoundCloudPlaying]);

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

      // Reset cached related tracks when user manually selects a track
      relatedTracksRef.current = [];
      relatedIndexRef.current = 0;

      if (track.source === 'spotify' && track.uri) {
        stopYouTube();
        stopSoundCloud();
        await spotify.playTrack(track.uri);
      } else if (track.source === 'youtube' && track.uri) {
        if (!spotify.paused) {
          spotify.togglePlay();
        }
        stopSoundCloud();

        setYoutubeCurrentTrack(track);
        setYoutubeProgress(0);
        setYoutubeDuration(track?.durationMs || 0);
        const videoId = track.videoId || track.id;

        // Fetch accurate duration from YouTube API if not present
        if (videoId && !track?.durationMs) {
          window.electronAPI.youtubeVideoDetails(videoId).then((details: any) => {
            if (details?.durationMs) {
              setYoutubeDuration(details.durationMs);
            }
          }).catch(() => {
            // ignore duration fetch errors
          });
        }

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
      } else if (track.source === 'soundcloud' && track.id) {
        stopYouTube();
        if (!spotify.paused) {
          spotify.togglePlay();
        }

        setSoundcloudCurrentTrack(track);
        setSoundcloudProgress(0);
        setSoundcloudDuration(track?.durationMs || 0);

        // Lazy-create audio element
        if (!soundcloudAudioRef.current) {
          soundcloudAudioRef.current = new Audio();
        }
        const audio = soundcloudAudioRef.current;
        audio.volume = volume;

        window.electronAPI.soundCloudGetStreamUrl(track.id).then((res: any) => {
          if (res?.success && res.url) {
            audio.src = res.url;
            audio.play().catch(() => {});
            setIsSoundCloudPlaying(true);
            navigate('/now-playing');
          } else {
            console.error('[Playback] Failed to get SoundCloud stream URL');
          }
        }).catch(() => {
          console.error('[Playback] Error fetching SoundCloud stream URL');
        });
      }
    },
    [spotify, youtubeMode, stopYouTube, volume]
  );

  // ── Autoplay related tracks ────────────────────────────────────
  const fetchAndPlayRelated = useCallback(
    async (track: any) => {
      if (!track) return false;
      try {
        if (track.source === 'youtube') {
          const videoId = track.videoId || track.id;
          if (!videoId) return false;
          const related = await window.electronAPI.youtubeGetRelated(videoId, 10);
          if (related.length > 0) {
            relatedTracksRef.current = related;
            relatedIndexRef.current = 0;
            playTrack(related[0]);
            return true;
          }
        } else if (track.source === 'spotify') {
          const seedId = track.id;
          if (!seedId) return false;
          const related = await window.electronAPI.spotifyGetRecommendations(seedId, 10);
          if (related.length > 0) {
            relatedTracksRef.current = related;
            relatedIndexRef.current = 0;
            playTrack(related[0]);
            return true;
          }
        }
      } catch {
        // ignore fetch errors
      }
      return false;
    },
    [playTrack]
  );

  const next = useCallback(() => {
    if (soundcloudCurrentTrack) {
      if (repeatMode === 'loop-single') {
        playTrack(soundcloudCurrentTrack);
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
              stopSoundCloud();
              return;
            }
          }
        }
        setYoutubeQueueIndex(nextIndex);
        playTrack(youtubeQueue[nextIndex]);
        return;
      }
      stopSoundCloud();
      return;
    }
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
              // Try autoplay if enabled
              if (autoplayEnabled && youtubeCurrentTrack) {
                fetchAndPlayRelated(youtubeCurrentTrack);
                return;
              }
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
      // No queue — try autoplay
      if (autoplayEnabled && youtubeCurrentTrack) {
        fetchAndPlayRelated(youtubeCurrentTrack);
        return;
      }
      stopYouTube();
    }
    // For Spotify tracks when not in YouTube/SoundCloud mode
    if (autoplayEnabled && spotify.currentTrack) {
      fetchAndPlayRelated({ ...spotify.currentTrack, source: 'spotify' });
      return;
    }
    spotify.nextTrack();
  }, [spotify, youtubeCurrentTrack, soundcloudCurrentTrack, youtubeQueue, youtubeQueueIndex, repeatMode, stopYouTube, stopSoundCloud, playTrack, autoplayEnabled, fetchAndPlayRelated]);

  const previous = useCallback(() => {
    if (soundcloudCurrentTrack) {
      if (repeatMode === 'loop-single') {
        playTrack(soundcloudCurrentTrack);
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
              stopSoundCloud();
              return;
            }
          }
        }
        setYoutubeQueueIndex(prevIndex);
        playTrack(youtubeQueue[prevIndex]);
        return;
      }
      stopSoundCloud();
      return;
    }
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
  }, [spotify, youtubeCurrentTrack, soundcloudCurrentTrack, youtubeQueue, youtubeQueueIndex, repeatMode, stopYouTube, stopSoundCloud, playTrack]);

  const seek = useCallback(
    (ms: number) => {
      if (soundcloudCurrentTrack && soundcloudAudioRef.current) {
        soundcloudAudioRef.current.currentTime = ms / 1000;
        setSoundcloudProgress(ms);
        return;
      }
      if (youtubeControllerRef.current?.seek) {
        youtubeControllerRef.current.seek(ms / 1000);
        setYoutubeProgress(ms);
      } else {
        spotify.seek(ms);
      }
    },
    [spotify, soundcloudCurrentTrack]
  );

  const setVolume = useCallback(
    (v: number) => {
      setVolumeState(v);
      spotify.setVolume(v);
      if (soundcloudAudioRef.current) {
        soundcloudAudioRef.current.volume = v;
      }
    },
    [spotify]
  );

  const pauseYouTube = useCallback(() => {
    if (youtubeControllerRef.current) {
      youtubeControllerRef.current.pause();
    }
    setIsYouTubePlaying(false);
  }, []);

  // Poll YouTube controllers for accurate progress; fallback to local timer
  useEffect(() => {
    if (!youtubeCurrentTrack) return;
    const interval = setInterval(() => {
      const ctrl = youtubeControllerRef.current;
      if (ctrl?.getTime) {
        Promise.resolve(ctrl.getTime()).then((time) => {
          if (time) {
            setYoutubeProgress(time.currentTime);
            if (time.duration > 0) setYoutubeDuration(time.duration);
          }
        }).catch(() => {
          // ignore controller errors
        });
      } else if (isYouTubePlaying) {
        setYoutubeProgress((prev) => {
          const next = prev + 500;
          return youtubeDuration > 0 && next > youtubeDuration ? youtubeDuration : next;
        });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [youtubeCurrentTrack, isYouTubePlaying, youtubeDuration]);

  // Poll SoundCloud audio element for progress
  useEffect(() => {
    if (!soundcloudCurrentTrack || !soundcloudAudioRef.current) return;
    const audio = soundcloudAudioRef.current;
    const onTimeUpdate = () => {
      setSoundcloudProgress(Math.floor(audio.currentTime * 1000));
    };
    const onDurationChange = () => {
      setSoundcloudDuration(Math.floor(audio.duration * 1000));
    };
    const onEnded = () => {
      setIsSoundCloudPlaying(false);
      callbacksRef.current.next();
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [soundcloudCurrentTrack]);

  // Keep refs to the latest callbacks so media-key subscriptions don't stale-close
  const callbacksRef = useRef({ play, pause, toggle, next, previous });
  callbacksRef.current = { play, pause, toggle, next, previous };

  // Ref to cache latest mini player state for when mini window opens after playback starts
  const miniPlayerStateRef = useRef<any>(null);

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
  const activeTrack = isSpotifyPlaying
    ? spotify.currentTrack
    : (youtubeCurrentTrack || soundcloudCurrentTrack || spotify.currentTrack);

  // ── Listening History tracking ─────────────────────────────────
  const historyTrackIdRef = useRef<string | null>(null);

  const finalizeHistory = useCallback(() => {
    if (historyTrackIdRef.current) {
      window.electronAPI.finalizeHistoryEvent(historyTrackIdRef.current, Date.now()).catch(() => {});
      historyTrackIdRef.current = null;
    }
  }, []);

  const startHistory = useCallback((track: any) => {
    if (!track) return;
    const trackId = track.id || track.uri || `${track.name}-${track.artist}`;
    if (historyTrackIdRef.current === trackId) return;

    finalizeHistory();

    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      trackId,
      name: track.name || track.title || 'Unknown',
      artist: track.artists?.map((a: any) => a.name).join(', ') || track.artist || track.channelTitle || 'Unknown',
      album: track.album?.name || track.album || '',
      image: track.album?.images?.[0]?.url || track.image || track.thumbnail || '',
      source: track.source || 'unknown',
      startedAt: Date.now(),
    };

    window.electronAPI.appendHistoryEvent(event).catch(() => {});
    historyTrackIdRef.current = trackId;
  }, [finalizeHistory]);

  useEffect(() => {
    if (activeTrack) {
      startHistory(activeTrack);
    } else {
      finalizeHistory();
    }
    return () => {
      finalizeHistory();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack?.id, activeTrack?.uri]);

  // ── Media Session API ──────────────────────────────────────────
  useEffect(() => {
    if (!activeTrack) {
      clearMediaSession();
      return;
    }
    updateMediaSession(activeTrack, isSpotifyPlaying || isYouTubePlaying || isSoundCloudPlaying, {
      onPlay: () => play(),
      onPause: () => pause(),
      onNext: () => next(),
      onPrevious: () => previous(),
      onSeek: (details) => {
        const target =
          details.seekTime ??
          (isSpotifyPlaying
            ? spotify.position + (details.seekOffset || 0) * 1000
            : isSoundCloudPlaying
              ? soundcloudProgress + (details.seekOffset || 0) * 1000
              : youtubeProgress + (details.seekOffset || 0) * 1000);
        if (target >= 0) seek(target);
      },
    });
  }, [activeTrack, isSpotifyPlaying, isYouTubePlaying, isSoundCloudPlaying, play, pause, next, previous, seek, spotify.position, youtubeProgress, soundcloudProgress]);

  // ── Discord Rich Presence ─────────────────────────────────────
  useEffect(() => {
    if (!activeTrack) {
      window.electronAPI.discordClearActivity().catch(() => {});
      return;
    }

    const isPlaying = isSpotifyPlaying || isYouTubePlaying || isSoundCloudPlaying;
    const now = Date.now();
    const activeProgress = isSpotifyPlaying
      ? spotify.position
      : isSoundCloudPlaying
        ? soundcloudProgress
        : youtubeProgress;
    const activeDuration = isSpotifyPlaying
      ? spotify.duration
      : isSoundCloudPlaying
        ? soundcloudDuration
        : youtubeDuration;
    const startTime = isPlaying ? now - activeProgress : undefined;
    const endTime = isPlaying && activeDuration > 0 ? startTime! + activeDuration : undefined;

    window.electronAPI.discordSetActivity({
      details: getTrackTitle(activeTrack),
      state: getTrackArtist(activeTrack),
      startTimestamp: startTime ? Math.floor(startTime / 1000) : undefined,
      endTimestamp: endTime ? Math.floor(endTime / 1000) : undefined,
      largeImageKey: 'livesound_logo',
      largeImageText: 'LiveSound',
      smallImageKey: isPlaying ? 'play' : 'pause',
      smallImageText: isPlaying ? 'Playing' : 'Paused',
    }).catch(() => {});

    // Broadcast to mini player
    const miniState = {
      title: getTrackTitle(activeTrack),
      artist: getTrackArtist(activeTrack),
      image: activeTrack?.album?.images?.[0]?.url || activeTrack?.image || activeTrack?.thumbnail,
      isPlaying,
      currentTime: activeProgress,
      duration: activeDuration,
      source: activeTrack?.source || '',
      uri: activeTrack?.uri || '',
      videoId: activeTrack?.videoId || activeTrack?.id || '',
    };
    miniPlayerStateRef.current = miniState;
    window.electronAPI.sendMiniPlayerState(miniState).catch(() => {});
  }, [activeTrack, isSpotifyPlaying, isYouTubePlaying, isSoundCloudPlaying, spotify.position, spotify.duration, youtubeProgress, youtubeDuration, soundcloudProgress, soundcloudDuration]);

  const isSoundCloudActive = !!soundcloudCurrentTrack;
  const value: PlaybackState = {
    isPlaying: isSpotifyPlaying || isYouTubePlaying || isSoundCloudPlaying,
    currentTrack: activeTrack,
    progress: isSpotifyPlaying
      ? spotify.position
      : isSoundCloudActive
        ? soundcloudProgress
        : youtubeProgress,
    duration: isSpotifyPlaying
      ? spotify.duration
      : isSoundCloudActive
        ? soundcloudDuration
        : youtubeDuration,
    volume,
    youtubeMode,
    youtubeCurrentTrack,
    isYouTubePlaying,
    soundcloudCurrentTrack,
    isSoundCloudPlaying,
    repeatMode,
    youtubeQueue,
    youtubeQueueIndex,
    autoplayEnabled,
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
    setAutoplayEnabled: (v: boolean) => {
      setAutoplayEnabled(v);
      window.electronAPI.saveSettings({ autoplayRelated: v }).catch(() => {});
    },
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be inside PlaybackProvider');
  return ctx;
}
