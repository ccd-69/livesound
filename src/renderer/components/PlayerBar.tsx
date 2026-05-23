import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Volume1,
  VolumeX,
} from 'lucide-react';
import { usePlayback } from '../hooks/usePlayback';
import { useNavigate, useLocation } from 'react-router-dom';
import EqualizerCanvas from './EqualizerCanvas';

function formatTime(ms: number) {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
  const playback = usePlayback();
  const navigate = useNavigate();
  const location = useLocation();
  const [showEqualizer, setShowEqualizer] = useState(false);

  // Hide equalizer in PlayerBar when on NowPlaying screen — the spectrum
  // analyzer is shown there instead. Keeps only one visualizer visible at a time.
  const isNowPlaying = location.pathname === '/now-playing';

  useEffect(() => {
    function refresh() {
      window.electronAPI.getSettings().then((s: any) => {
        setShowEqualizer(s.showEqualizer ?? false);
      });
    }
    refresh();
    window.addEventListener('settings-changed', refresh);
    return () => window.removeEventListener('settings-changed', refresh);
  }, []);

  const progressPercent = playback.duration
    ? (playback.progress / playback.duration) * 100
    : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    playback.seek(Math.floor(pct * (playback.duration || 0)));
  };

  const VolumeIcon =
    playback.volume === 0 ? VolumeX : playback.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex h-20 items-center gap-4 glass-dark px-6 border-t border-border">
      {/* Album Art */}
      <motion.div
        className="h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-md bg-hover"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={() => navigate('/now-playing')}
      >
        {playback.currentTrack?.album?.images?.[0]?.url ? (
          <img
            src={playback.currentTrack.album.images[0].url}
            alt="Album art"
            className="h-full w-full object-cover"
          />
        ) : playback.currentTrack?.image ? (
          <img
            src={playback.currentTrack.image}
            alt="Album art"
            className="h-full w-full object-cover"
          />
        ) : null}
      </motion.div>

      {/* Track Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {playback.currentTrack?.name || 'No track selected'}
        </div>
        <div className="truncate text-xs text-muted">
          {playback.currentTrack?.artists?.map((a: any) => a.name).join(', ') ||
            playback.currentTrack?.artist ||
            'Select a track to play'}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <ControlButton onClick={playback.previous} icon={<SkipBack size={20} />} />
        <ControlButton
          onClick={playback.toggle}
          icon={
            playback.isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" />
            )
          }
          large
        />
        <ControlButton onClick={playback.next} icon={<SkipForward size={20} />} />
        <CycleButton
          mode={playback.repeatMode}
          onClick={playback.toggleRepeatMode}
        />
      </div>

      {/* Equalizer — hidden on NowPlaying since the spectrum analyzer is shown there */}
      <AnimatePresence>
        {showEqualizer && !isNowPlaying && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex items-center overflow-hidden"
          >
            <EqualizerCanvas barCount={24} height={32} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress */}
      <div className="flex flex-1 items-center gap-2">
        <span className="min-w-[36px] text-right text-xs text-muted tabular-nums">
          {formatTime(playback.progress)}
        </span>

        <div
          className="group relative h-5 flex-1 cursor-pointer"
          onClick={handleSeek}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-hover">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-accent opacity-0 shadow-sm group-hover:opacity-100 transition-[left] duration-300 ease-out"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>

        <span className="min-w-[36px] text-xs text-muted tabular-nums">
          {formatTime(playback.duration)}
        </span>
      </div>

      {/* Volume */}
      <div className="flex w-[120px] items-center gap-2">
        <button
          onClick={() => playback.setVolume(playback.volume === 0 ? 0.8 : 0)}
          className="text-muted transition-colors hover:text-text"
        >
          <VolumeIcon size={16} />
        </button>
        <div className="group relative h-5 flex-1 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, x / rect.width));
            playback.setVolume(pct);
          }}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-hover">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(playback.volume || 0) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  icon,
  large,
  active,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  large?: boolean;
  active?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`flex items-center justify-center rounded-full text-text transition-colors ${
        large ? 'h-10 w-10' : 'h-8 w-8'
      } ${active ? 'bg-accent/20 text-accent' : 'bg-transparent hover:text-accent'}`}
    >
      {icon}
    </motion.button>
  );
}

function CycleButton({
  mode,
  onClick,
}: {
  mode: import('../hooks/usePlayback').RepeatMode;
  onClick: () => void;
}) {
  const isActive = mode !== 'off';
  const icon =
    mode === 'shuffle' ? (
      <Shuffle size={18} />
    ) : mode === 'loop-single' ? (
      <div className="relative flex items-center justify-center">
        <Repeat size={18} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent text-[7px] font-bold text-black leading-none">1</span>
      </div>
    ) : (
      <Repeat size={18} />
    );

  return (
    <motion.button
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={
        mode === 'off'
          ? 'Repeat: Off'
          : mode === 'loop'
          ? 'Repeat: Loop'
          : mode === 'loop-single'
          ? 'Repeat: Loop Single'
          : 'Shuffle'
      }
      className={`flex items-center justify-center rounded-full text-text transition-colors h-8 w-8 ${
        isActive ? 'bg-accent/20 text-accent' : 'bg-transparent hover:text-accent'
      }`}
    >
      {icon}
    </motion.button>
  );
}
