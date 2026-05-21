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
    params.set('origin', window.location.origin);
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
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

  return (
    <div className={`relative flex flex-col items-center gap-2 ${className}`}>
      <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-lg" style={{ aspectRatio: '16/9' }}>
        {!iframeLoaded && (
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
