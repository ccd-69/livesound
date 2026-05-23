import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { usePlayback } from '../hooks/usePlayback';
import { connectAudioElement } from '../lib/audioAnalyser';

interface DirectStreamPlayerProps {
  videoUrl: string;
  className?: string;
}

export default function DirectStreamPlayer({
  videoUrl,
  className = '',
}: DirectStreamPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const playback = usePlayback();

  useEffect(() => {
    let cancelled = false;

    async function loadStream() {
      setLoading(true);
      setError('');
      setStreamUrl('');

      try {
        const result = await window.electronAPI.youtubeGetStreamUrl(videoUrl);
        if (cancelled) return;

        if (result.success && result.url) {
          setStreamUrl(result.url);
          setTitle(result.title || '');
        } else {
          setError(result.error || 'Failed to extract stream URL');
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStream();
    return () => { cancelled = true; };
  }, [videoUrl]);

  // Register controller so global play/pause controls work for direct-stream mode
  useEffect(() => {
    if (!streamUrl) return;
    const controller = {
      play: () => {
        audioRef.current?.play().catch(() => {});
        setPlaying(true);
      },
      pause: () => {
        audioRef.current?.pause();
        setPlaying(false);
      },
      seek: (seconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds;
        }
      },
    };
    playback.setYoutubeController(controller);
    return () => {
      playback.setYoutubeController(null);
    };
  }, [streamUrl, playback.setYoutubeController]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  // Connect audio element to the visualizer analyser for real frequency data
  useEffect(() => {
    if (audioRef.current && streamUrl) {
      connectAudioElement(audioRef.current);
    }
  }, [streamUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center gap-2 text-muted ${className}`}>
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Extracting audio stream...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 ${className}`}>
        <AlertCircle size={18} />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {title && (
        <p className="max-w-md truncate text-center text-sm text-muted">{title}</p>
      )}

      <audio
        ref={audioRef}
        src={streamUrl}
        autoPlay
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          if (playback.repeatMode === 'loop-single') {
            audioRef.current?.play().catch(() => {});
          } else if (playback.repeatMode === 'loop' || playback.repeatMode === 'shuffle') {
            playback.next();
          }
        }}
      />

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={togglePlay}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-lg"
      >
        {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
      </motion.button>
    </div>
  );
}
