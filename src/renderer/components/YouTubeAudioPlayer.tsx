import React, { useEffect, useRef } from 'react';
import { usePlayback } from '../hooks/usePlayback';

export default function YouTubeAudioPlayer() {
  const playback = usePlayback();

  if (!playback.isYouTubePlaying || !playback.youtubeCurrentTrack) return null;

  const track = playback.youtubeCurrentTrack;

  return (
    <div
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2"
      style={{ width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      {/* Only direct-stream needs a hidden audio element.
          For iframe/webview, the visible player in NowPlaying handles everything. */}
      {playback.youtubeMode === 'direct-stream' && track.uri && (
        <DirectStreamAudio videoUrl={track.uri} />
      )}
    </div>
  );
}

function DirectStreamAudio({ videoUrl }: { videoUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [streamUrl, setStreamUrl] = React.useState('');
  const [error, setError] = React.useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.electronAPI.youtubeGetStreamUrl(videoUrl);
        if (cancelled) return;
        if (result.success && result.url) {
          setStreamUrl(result.url);
        } else {
          setError(result.error || 'Failed to get stream');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [videoUrl]);

  if (error || !streamUrl) return null;

  return (
    <audio
      ref={audioRef}
      src={streamUrl}
      autoPlay
      style={{ width: '100%', height: '100%' }}
    />
  );
}
