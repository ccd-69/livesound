import { useEffect, useState } from 'react';
import { startAudioCapture } from '../lib/audioAnalyser';

export function useAudioAnalyser() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startAudioCapture().then((success) => {
      if (!cancelled) setReady(success);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
