import React, { useEffect } from 'react';
import { usePlayback } from '../hooks/usePlayback';

// Known embeddable video for testing iframe playback
const TEST_TRACK = {
  source: 'youtube',
  uri: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
  name: 'Rick Astley - Never Gonna Give You Up (Test Track)',
  artists: [{ name: 'Rick Astley' }],
};

export default function AutoTestPlayer() {
  const playback = usePlayback();

  useEffect(() => {
    const timer = setTimeout(async () => {
      console.log('[AUTOTEST] Starting auto-playback test...');
      console.log('[AUTOTEST] Current youtubeMode in hook:', playback.youtubeMode);

      const settings = await window.electronAPI.getSettings();
      console.log('[AUTOTEST] Settings youtubePlaybackMode:', settings.youtubePlaybackMode);

      console.log('[AUTOTEST] Calling playTrack...');
      await playback.playTrack(TEST_TRACK);
      console.log('[AUTOTEST] playTrack returned.');
    }, 3000);

    return () => clearTimeout(timer);
  }, [playback]);

  return null;
}
