import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { connectAudioElement, stopAudioCapture } from '../lib/audioAnalyser';
import { getYouTubeVideoId } from '../lib/utils';

/**
 * Persistent background YouTube audio player.
 * Lives inside Layout.tsx (outside the router) so audio keeps playing
 * regardless of which route the user is on.
 */
export default function YouTubeAudioPlayer() {
  const playback = usePlayback();

  if (!playback.isYouTubePlaying || !playback.youtubeCurrentTrack) return null;

  const track = playback.youtubeCurrentTrack;
  const mode = playback.youtubeMode;

  return (
    <div
      className="fixed inset-0 z-[-1]"
      style={{ width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {mode === 'iframe' && track.uri && (
        <PersistentYouTubePlayer url={track.uri} playing={playback.isPlaying} />
      )}
      {mode === 'direct-stream' && track.uri && (
        <PersistentDirectStream videoUrl={track.uri} />
      )}
      {mode === 'webview' && (
        <PersistentWebViewPlayer
          videoId={getYouTubeVideoId(track.uri) || track.videoId || track.id}
        />
      )}
      {/* ytm-web is handled by the main process WebContentsView */}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Persistent Iframe Player                                          */
/* ------------------------------------------------------------------ */

function loadYouTubeAPI(): Promise<any> {
  return new Promise((resolve) => {
    const w = window as any;
    if (w.YT && w.YT.Player) {
      resolve(w.YT);
      return;
    }
    if (!w._ytApiPromises) w._ytApiPromises = [];
    w._ytApiPromises.push(resolve);

    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;

    const existingReady = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (existingReady) existingReady();
      w._ytApiPromises?.forEach((r: any) => r(w.YT));
      w._ytApiPromises = [];
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);
  });
}

function PersistentYouTubePlayer({ url, playing }: { url: string; playing: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const playback = usePlayback();
  const videoId = getYouTubeVideoId(url);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    setReady(false);
    let cancelled = false;

    loadYouTubeAPI().then((YT) => {
      if (cancelled) return;
      const player = new YT.Player(containerRef.current!, {
        videoId,
        playerVars: {
          autoplay: playing ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
          onStateChange: (event: any) => {
            if (event.data === 0) {
              if (playback.repeatMode === 'loop-single') {
                player.seekTo(0, true);
                player.playVideo();
              } else {
                playback.next();
              }
            }
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      setReady(false);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  useEffect(() => {
    if (!ready || !playerRef.current) return;
    try {
      if (playing) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch {}
  }, [playing, ready]);

  useEffect(() => {
    if (!videoId || !ready) return;
    const controller = {
      play: () => {
        try {
          playerRef.current?.playVideo();
        } catch {}
      },
      pause: () => {
        try {
          playerRef.current?.pauseVideo();
        } catch {}
      },
      seek: (seconds: number) => {
        try {
          playerRef.current?.seekTo(seconds, true);
        } catch {}
      },
      getTime: () => {
        try {
          const currentTime = playerRef.current?.getCurrentTime?.() || 0;
          const duration = playerRef.current?.getDuration?.() || 0;
          return { currentTime: currentTime * 1000, duration: duration * 1000 };
        } catch {
          return null;
        }
      },
    };
    playback.setYoutubeController(controller);
    return () => {
      playback.setYoutubeController(null);
    };
  }, [videoId, ready, playback.setYoutubeController]);

  return <div ref={containerRef} className="h-full w-full" />;
}

/* ------------------------------------------------------------------ */
/*  Persistent Direct-Stream Audio                                    */
/* ------------------------------------------------------------------ */

const STREAM_URL_MAX_AGE_MS = 5 * 60 * 60 * 1000;

function PersistentDirectStream({ videoUrl }: { videoUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const playback = usePlayback();
  const streamUrlFetchedAtRef = useRef<number>(0);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);

  const loadStream = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const result = await window.electronAPI.youtubeGetStreamUrl(videoUrl);
      if (result.success && result.url) {
        setStreamUrl(result.url);
        streamUrlFetchedAtRef.current = Date.now();
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = setTimeout(() => {
          loadStream();
        }, STREAM_URL_MAX_AGE_MS);
      }
    } catch {
      // ignore
    } finally {
      isRefreshingRef.current = false;
    }
  }, [videoUrl]);

  useEffect(() => {
    loadStream();
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      stopAudioCapture();
    };
  }, [videoUrl, loadStream]);

  useEffect(() => {
    if (!streamUrl) return;
    const controller = {
      play: () => {
        audioRef.current?.play().catch(() => {});
      },
      pause: () => {
        audioRef.current?.pause();
      },
      seek: (seconds: number) => {
        if (audioRef.current) audioRef.current.currentTime = seconds;
      },
      getTime: () => {
        if (!audioRef.current) return null;
        return {
          currentTime: audioRef.current.currentTime * 1000,
          duration: (audioRef.current.duration || 0) * 1000,
        };
      },
    };
    playback.setYoutubeController(controller);
    return () => {
      playback.setYoutubeController(null);
    };
  }, [streamUrl, playback.setYoutubeController]);

  useEffect(() => {
    if (audioRef.current && streamUrl) {
      connectAudioElement(audioRef.current);
    }
    return () => {
      stopAudioCapture();
    };
  }, [streamUrl]);

  const handleError = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    loadStream();
  }, [loadStream]);

  return (
    <audio
      ref={audioRef}
      src={streamUrl}
      autoPlay
      className="hidden"
      onError={handleError}
      onEnded={() => {
        if (playback.repeatMode === 'loop-single') {
          audioRef.current?.play().catch(() => {});
        } else {
          playback.next();
        }
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Persistent WebView Player                                         */
/* ------------------------------------------------------------------ */

function PersistentWebViewPlayer({ videoId }: { videoId: string }) {
  const webviewRef = useRef<Electron.WebviewTag>(null);
  const playback = usePlayback();

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&controls=1`;
    webview.src = src;
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    const controller = {
      play: () => {
        webviewRef.current?.executeJavaScript(`
          const video = document.querySelector('video');
          if (video) video.play();
        `).catch(() => {});
      },
      pause: () => {
        webviewRef.current?.executeJavaScript(`
          const video = document.querySelector('video');
          if (video) video.pause();
        `).catch(() => {});
      },
      seek: (seconds: number) => {
        webviewRef.current?.executeJavaScript(`
          const video = document.querySelector('video');
          if (video) video.currentTime = ${seconds};
        `).catch(() => {});
      },
      getTime: async () => {
        try {
          const result = await webviewRef.current?.executeJavaScript(`
            (() => {
              const v = document.querySelector('video');
              return v ? { currentTime: v.currentTime, duration: v.duration } : null;
            })()
          `);
          if (!result) return null;
          return {
            currentTime: (result.currentTime || 0) * 1000,
            duration: (result.duration || 0) * 1000,
          };
        } catch {
          return null;
        }
      },
    };
    playback.setYoutubeController(controller);
    return () => {
      playback.setYoutubeController(null);
    };
  }, [videoId, playback.setYoutubeController]);

  return (
    <div className="h-full w-full">
      {/* @ts-ignore - webview tag is enabled in Electron */}
      <webview
        ref={webviewRef}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&controls=1`}
        style={{ display: 'inline-flex', width: '100%', height: '100%' }}
        allowpopups={false}
        nodeintegration={false}
        webpreferences="contextIsolation=yes, sandbox=yes"
      />
    </div>
  );
}
