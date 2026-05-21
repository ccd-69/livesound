import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
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
  const [muted, setMuted] = useState(false);
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

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    if (nextMuted) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'mute', args: [] }),
        '*'
      );
    } else {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
        '*'
      );
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  }, [muted]);

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

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleMute}
        className="flex items-center gap-2 rounded-full bg-hover px-4 py-2 text-sm text-text transition-colors hover:bg-accent/20"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        {muted ? 'Click to unmute' : 'Muted'}
      </motion.button>
    </div>
  );
}
