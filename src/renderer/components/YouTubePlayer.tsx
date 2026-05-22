import React, { useState, useMemo, useEffect, useRef } from 'react';
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

export default function YouTubePlayer({
  url,
  className = '',
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const playback = usePlayback();

  const videoId = useMemo(() => getYouTubeVideoId(url), [url]);

  const embedUrl = useMemo(() => {
    if (!videoId) return '';
    const params = new URLSearchParams();
    params.set('autoplay', '1');
    params.set('modestbranding', '1');
    params.set('rel', '0');
    params.set('playsinline', '1');
    params.set('enablejsapi', '1');
    params.set('controls', '0');
    params.set('disablekb', '1');
    params.set('origin', window.location.origin);
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  // Listen for iframe errors (age-restricted, copyright, etc.)
  useEffect(() => {
    if (!videoId) return;
    setIframeError(null);
    setIframeLoaded(false);

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube.com')) return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onError') {
          const code = data.info;
          // 101 = not embeddable, 150 = same + age-restricted
          if (code === 101 || code === 150) {
            setIframeError('This video is age-restricted or cannot be embedded. Switch to Direct Stream mode in Settings to play it.');
          } else if (code === 100) {
            setIframeError('This video is private or has been removed.');
          } else {
            setIframeError(`Video playback error (${code}).`);
          }
        } else if (data.event === 'onReady') {
          setIframeLoaded(true);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [videoId]);

  // Register controller so global play/pause controls work for iframe mode
  useEffect(() => {
    if (!videoId) return;
    const controller = {
      play: () => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      },
      pause: () => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      },
      seek: (seconds: number) => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
          '*'
        );
      },
    };
    playback.setYoutubeController(controller);
    return () => {
      playback.setYoutubeController(null);
    };
  }, [videoId, playback.setYoutubeController]);

  if (!videoId) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-black px-6 py-12 text-muted ${className}`}>
        <span className="text-sm">Invalid YouTube URL</span>
      </div>
    );
  }

  async function switchToDirectStream() {
    const s = await window.electronAPI.getSettings();
    await window.electronAPI.saveSettings({ ...s, youtubePlaybackMode: 'direct-stream' });
    // Reload the page so the new mode takes effect
    window.location.reload();
  }

  return (
    <div className={`relative flex flex-col items-center gap-2 ${className}`}>
      <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-lg" style={{ aspectRatio: '16/9' }}>
        {iframeError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
            <span className="text-sm text-red-400">{iframeError}</span>
            {iframeError.includes('age-restricted') && (
              <button
                onClick={switchToDirectStream}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Switch to Direct Stream
              </button>
            )}
          </div>
        )}
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-muted">
            <span className="text-sm">Loading video...</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0"
          onLoad={() => setIframeLoaded(true)}
        />
      </div>

    </div>
  );
}
