import React, { useState, useEffect, useRef } from 'react';
import { usePlayback } from '../hooks/usePlayback';

interface YouTubePlayerProps {
  url: string;
  playing?: boolean;
  className?: string;
}

function getYouTubeVideoId(uri: string): string | null {
  if (!uri) return null;
  const m = uri.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Load the YouTube IFrame API once globally. */
function loadYouTubeAPI(): Promise<any> {
  return new Promise((resolve) => {
    const w = window as any;
    if (w.YT && w.YT.Player) {
      resolve(w.YT);
      return;
    }
    if (!w._ytApiPromises) w._ytApiPromises = [];
    w._ytApiPromises.push(resolve);

    // Already injecting — just wait for the shared callback
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

export default function YouTubePlayer({
  url,
  playing = true,
  className = '',
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const playback = usePlayback();

  const videoId = getYouTubeVideoId(url);

  // Create / recreate the YT.Player when videoId changes
  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    setPlayerReady(false);
    setPlayerError(null);

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
            if (!cancelled) setPlayerReady(true);
          },
          onStateChange: (event: any) => {
            // Track local play state so the UI stays in sync
            // YT.PlayerState: UNSTARTED=-1, ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3, CUED=5
            if (event.data === 0) {
              // ended
              if (playback.repeatMode === 'loop-single') {
                player.seekTo(0, true);
                player.playVideo();
              } else {
                playback.next();
              }
            }
          },
          onError: (event: any) => {
            const code = event.data;
            if (code === 101 || code === 150) {
              setPlayerError(
                'This video is age-restricted or cannot be embedded. Switch to Direct Stream mode in Settings to play it.',
              );
            } else if (code === 100) {
              setPlayerError('This video is private or has been removed.');
            } else {
              setPlayerError(`Video playback error (${code}).`);
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      setPlayerReady(false);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Sync the "playing" prop if it changes after mount
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;
    try {
      if (playing) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // ignore
    }
  }, [playing, playerReady]);

  // Register controller so global play/pause/seek/progress work
  useEffect(() => {
    if (!videoId || !playerReady) return;

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
          return {
            currentTime: currentTime * 1000,
            duration: duration * 1000,
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
  }, [videoId, playerReady, playback.setYoutubeController]);

  async function switchToDirectStream() {
    const s = await window.electronAPI.getSettings();
    await window.electronAPI.saveSettings({
      ...s,
      youtubePlaybackMode: 'direct-stream',
    });
    window.location.reload();
  }

  if (!videoId) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-black px-6 py-12 text-muted ${className}`}
      >
        <span className="text-sm">Invalid YouTube URL</span>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center gap-2 ${className}`}>
      <div
        className="relative w-full overflow-hidden rounded-xl bg-black shadow-lg"
        style={{ aspectRatio: '16/9' }}
      >
        {playerError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
            <span className="text-sm text-red-400">{playerError}</span>
            {playerError.includes('age-restricted') && (
              <button
                onClick={switchToDirectStream}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Switch to Direct Stream
              </button>
            )}
          </div>
        )}
        {!playerReady && !playerError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-muted">
            <span className="text-sm">Loading video...</span>
          </div>
        )}
        <div
          ref={containerRef}
          className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
        />
      </div>
    </div>
  );
}
