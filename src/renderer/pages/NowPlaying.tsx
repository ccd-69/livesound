import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Volume1,
  VolumeX,
  ChevronDown,
  Music,
  MonitorPlay,
  Activity,
  CircleDot,
  Waves,
} from 'lucide-react';
import { usePlayback } from '../hooks/usePlayback';
import VisualizerCanvas, { VisualizerMode } from '../components/VisualizerCanvas';
import LyricsDisplay from '../components/LyricsDisplay';

function formatTime(ms: number) {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NowPlaying() {
  const playback = usePlayback();
  const navigate = useNavigate();
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('spectrum');
  const [bgGradient, setBgGradient] = useState('');

  const track = playback.currentTrack;
  const albumImage =
    track?.album?.images?.[0]?.url ||
    track?.thumbnail ||
    track?.image ||
    track?.album?.images?.[1]?.url ||
    '';

  useEffect(() => {
    function refresh() {
      window.electronAPI.getSettings().then((s: any) => {
        setShowSpectrum(s.showSpectrumAnalyzer ?? false);
        const validModes: VisualizerMode[] = ['spectrum', 'circular', 'waveform'];
        const mode = validModes.includes(s.visualizerMode) ? s.visualizerMode : 'spectrum';
        setVisualizerMode(mode);
      });
    }
    refresh();
    window.addEventListener('settings-changed', refresh);
    return () => window.removeEventListener('settings-changed', refresh);
  }, []);

  // Generate a blurred background from the album image
  useEffect(() => {
    if (!albumImage) {
      setBgGradient('');
      return;
    }
    // Use the image as a background with heavy blur
    setBgGradient(`url(${albumImage})`);
  }, [albumImage]);

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
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {/* Blurred background */}
      {albumImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: bgGradient, filter: 'blur(60px) brightness(0.4)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-row w-full h-full glass-card overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center gap-4 px-6 py-6 overflow-auto">
          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')}
            className="text-text/60 hover:text-text transition-colors shrink-0"
          >
            <ChevronDown size={28} />
          </motion.button>

          {/* Album Art / Thumbnail */}
          <motion.div
            className="relative aspect-square w-72 overflow-hidden rounded-2xl shadow-2xl shrink-0"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            whileHover={{ scale: 1.02, rotate: 1 }}
          >
            {albumImage ? (
              <img
                src={albumImage}
                alt={track?.name || 'Album art'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-hover text-muted">
                <Music size={64} strokeWidth={1} />
              </div>
            )}
          </motion.div>

          {/* ytm-web indicator pill */}
          {playback.youtubeMode === 'ytm-web' && playback.youtubeCurrentTrack && (
            <div className="flex items-center gap-2 rounded-full bg-hover px-3 py-1 text-xs text-muted">
              <MonitorPlay size={14} className="text-accent" />
              {playback.isPlaying ? 'Playing in YouTube Music' : 'Paused in YouTube Music'}
            </div>
          )}

          {/* Visualizer — right below media, before any tall info sections */}
          {showSpectrum && (
            <div className="w-full px-2 shrink-0 min-h-[140px] flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2">
                {[
                  { mode: 'spectrum' as VisualizerMode, icon: <Activity size={14} />, label: 'Bars' },
                  { mode: 'circular' as VisualizerMode, icon: <CircleDot size={14} />, label: 'Circle' },
                  { mode: 'waveform' as VisualizerMode, icon: <Waves size={14} />, label: 'Wave' },
                ].map((m) => (
                  <button
                    key={m.mode}
                    onClick={() => {
                      setVisualizerMode(m.mode);
                      window.electronAPI.saveSettings({ visualizerMode: m.mode });
                    }}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      visualizerMode === m.mode
                        ? 'bg-accent text-black'
                        : 'bg-hover text-muted hover:text-text'
                    }`}
                    title={m.label}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
              <VisualizerCanvas mode={visualizerMode} barCount={64} height={120} />
            </div>
          )}

          {/* Track Info */}
          <div className="flex flex-col items-center gap-1 text-center">
            <motion.h1
              key={track?.name || 'no-track-name'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold text-text"
            >
              {track?.name || 'No track selected'}
            </motion.h1>
            <motion.p
              key={track?.artists?.map((a: any) => a.name).join(', ') || track?.artist || track?.channelTitle || 'no-track-artist'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="text-base text-muted"
            >
              {track?.artists?.map((a: any) => a.name).join(', ') || track?.artist || track?.channelTitle}
            </motion.p>
          </div>

          {/* Lyrics Display */}
          <LyricsDisplay
            trackName={track?.name || track?.title}
            artistName={track?.artists?.map((a: any) => a.name).join(', ') || track?.artist}
            albumName={track?.album?.name}
            duration={playback.duration}
            currentTime={playback.progress}
            isPlaying={playback.isPlaying}
          />

          {/* Progress + Controls + Volume */}
          <>
            {/* Progress Bar */}
            <div className="flex w-full flex-col gap-2">
                <div
                  className="group relative h-6 w-full cursor-pointer"
                  onClick={handleSeek}
                >
                  <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-accent opacity-0 shadow-lg group-hover:opacity-100 transition-[left] duration-300 ease-out"
                    style={{ left: `calc(${progressPercent}% - 8px)` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{formatTime(playback.progress)}</span>
                  <span>{formatTime(playback.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6">
                <ControlButton
                  onClick={playback.previous}
                  icon={<SkipBack size={28} fill="currentColor" />}
                  large
                />
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={playback.toggle}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-black shadow-lg transition-shadow hover:shadow-xl"
                >
                  {playback.isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </motion.button>
                <ControlButton
                  onClick={playback.next}
                  icon={<SkipForward size={28} fill="currentColor" />}
                  large
                />
                <CycleButton
                  mode={playback.repeatMode}
                  onClick={playback.toggleRepeatMode}
                />
              </div>

              {/* Volume */}
              <div className="flex w-full items-center gap-3 px-4">
                <button
                  onClick={() => playback.setVolume(playback.volume === 0 ? 0.8 : 0)}
                  className="text-muted transition-colors hover:text-text"
                >
                  <VolumeIcon size={18} />
                </button>
                <div
                  className="group relative h-6 flex-1 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(1, x / rect.width));
                    playback.setVolume(pct);
                  }}
                >
                  <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${(playback.volume || 0) * 100}%` }}
                    />
                  </div>
                </div>
            </div>
          </>
        </div>

        {/* Playlist Sidebar */}
        {(playback.youtubeCurrentTrack || playback.soundcloudCurrentTrack) && playback.youtubeQueue.length > 0 && (
          <div className="w-64 h-full overflow-y-auto border-l border-border/50 px-3 py-4 shrink-0">
            <p className="text-xs font-semibold text-muted uppercase mb-3">Up Next</p>
            <div className="flex flex-col gap-1">
              {playback.youtubeQueue.map((t: any, i: number) => (
                <div
                  key={t.id}
                  onClick={() => {
                    playback.setYoutubeQueue(playback.youtubeQueue, i);
                    playback.playTrack(t);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                    i === playback.youtubeQueueIndex
                      ? 'bg-accent/20 text-text'
                      : 'text-muted hover:bg-hover hover:text-text'
                  }`}
                >
                  {t.image && (
                    <img src={t.image} className="h-8 w-8 rounded object-cover shrink-0" alt="" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{t.name}</p>
                    <p className="text-xs truncate opacity-70">{t.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      className={`flex items-center justify-center rounded-full text-text transition-colors ${
        large ? 'h-10 w-10' : 'h-8 w-8'
      } ${active ? 'bg-accent/20 text-accent' : 'text-text/70 hover:text-text'}`}
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
      <Shuffle size={20} />
    ) : mode === 'loop-single' ? (
      <div className="relative flex items-center justify-center">
        <Repeat size={20} />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-black leading-none">1</span>
      </div>
    ) : (
      <Repeat size={20} />
    );

  return (
    <motion.button
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.88 }}
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
        isActive ? 'bg-accent/20 text-accent' : 'text-text/70 hover:text-text'
      }`}
    >
      {icon}
    </motion.button>
  );
}
