import React, { useState, useEffect, useCallback } from 'react';
import { startBPMDetection, stopBPMDetection } from '../audio/analysis/bpm';

export default function BPMDisplay() {
  const [bpm, setBpm] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  const handleBPM = useCallback((value: number) => {
    setBpm(Math.round(value));
  }, []);

  const toggle = useCallback(() => {
    if (active) {
      stopBPMDetection();
      setActive(false);
      setBpm(null);
    } else {
      startBPMDetection(handleBPM);
      setActive(true);
    }
  }, [active, handleBPM]);

  useEffect(() => {
    return () => {
      stopBPMDetection();
    };
  }, []);

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-border bg-transparent text-muted hover:text-text'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-accent animate-pulse' : 'bg-hover'}`} />
      {bpm !== null ? `${bpm} BPM` : 'Detect BPM'}
    </button>
  );
}
