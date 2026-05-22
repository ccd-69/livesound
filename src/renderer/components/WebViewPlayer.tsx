import React, { useEffect, useRef } from 'react';
import { usePlayback } from '../hooks/usePlayback';

interface WebViewPlayerProps {
  videoId: string;
  className?: string;
}

export default function WebViewPlayer({
  videoId,
  className = '',
}: WebViewPlayerProps) {
  const webviewRef = useRef<Electron.WebviewTag>(null);
  const playback = usePlayback();

  useEffect(() => {
    // The webview tag is available because webviewTag: true is set in main.ts
    const webview = webviewRef.current;
    if (!webview) return;

    const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&modestbranding=1&rel=0`;
    webview.src = src;

    const handleLoaded = () => {
      console.log('WebView loaded:', videoId);
    };

    const handleError = (e: any) => {
      console.error('WebView error:', e);
    };

    webview.addEventListener('did-finish-load', handleLoaded);
    webview.addEventListener('did-fail-load', handleError);

    return () => {
      webview.removeEventListener('did-finish-load', handleLoaded);
      webview.removeEventListener('did-fail-load', handleError);
    };
  }, [videoId]);

  // Register controller so global play/pause controls work for webview mode
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
    };
    playback.setYoutubeController(controller);
    return () => {
      playback.setYoutubeController(null);
    };
  }, [videoId, playback.setYoutubeController]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black shadow-lg ${className}`}>
      {/* @ts-ignore - webview tag is enabled in Electron */}
      <webview
        ref={webviewRef}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&modestbranding=1&rel=0`}
        style={{
          display: 'inline-flex',
          width: '100%',
          height: '100%',
          minHeight: '360px',
        }}
        allowpopups={false}
        nodeintegration={false}
        webpreferences="contextIsolation=yes, sandbox=yes"
      />
    </div>
  );
}
