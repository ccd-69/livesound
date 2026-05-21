import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { getYouTubeVideoId, convertMusicUrlToYouTube } from '../lib/utils';
import { usePlayback } from '../hooks/usePlayback';
import { SpectrumAnalyzer } from '../components/AudioVisualizer';
import YouTubePlayer from '../components/YouTubePlayer';
import DirectStreamPlayer from '../components/DirectStreamPlayer';
import WebViewPlayer from '../components/WebViewPlayer';

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
  const [bgGradient, setBgGradient] = useState('');

  const track = playback.currentTrack;
  const albumImage = track?.album?.images?.[0]?.url;

  useEffect(() => {
    window.electronAPI.getSettings().then((s: any) => {
      setShowSpectrum(s.showSpectrumAnalyzer ?? false);
    });
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
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-6 w-full h-full glass-card overflow-hidden">
        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/')}
          className="absolute top-4 left-1/2 -translate-x-1/2 text-text/60 hover:text-text transition-colors"
        >
          <ChevronDown size={28} />
        </motion.button>

        {/* Album Art / YouTube Player */}
        {playback.youtubeCurrentTrack ? (
          <>
            {playback.youtubeMode === 'iframe' && playback.youtubeCurrentTrack?.uri && (
              <YouTubePlayer
                url={convertMusicUrlToYouTube(playback.youtubeCurrentTrack.uri)}
                playing={playback.isPlaying}
                className="w-full h-full"
              />
            )}
            {playback.youtubeMode === 'direct-stream' && playback.youtubeCurrentTrack?.uri && (
              <DirectStreamPlayer
                videoUrl={playback.youtubeCurrentTrack.uri}
                className="w-full h-full"
              />
            )}
            {playback.youtubeMode === 'webview' && playback.youtubeCurrentTrack?.uri && (
              <WebViewPlayer
                videoId={getYouTubeVideoId(playback.youtubeCurrentTrack.uri) || playback.youtubeCurrentTrack.videoId || playback.youtubeCurrentTrack.id}
                className="w-full h-full"
              />
            )}
            {playback.youtubeMode === 'ytm-web' && (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-hover px-8 py-12 text-center">
                <MonitorPlay size={48} className="text-accent" />
                <p className="text-lg font-semibold text-text">
                  {playback.isPlaying ? 'Playing in YouTube Music' : 'Paused in YouTube Music'}
                </p>
                <p className="text-sm text-muted">The full YouTube Music web player is active in the background.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <motion.div
              className="relative aspect-square w-72 overflow-hidden rounded-2xl shadow-2xl"
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

            {/* Spectrum Analyzer */}
            <AnimatePresence>
              {showSpectrum && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <SpectrumAnalyzer barCount={64} barWidth={4} barGap={2} height={64} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
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
            key={track?.artists?.map((a: any) => a.name).join(', ') || 'no-track-artist'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="text-base text-muted"
          >
            {track?.artists?.map((a: any) => a.name).join(', ') || 'Select a track to play'}
          </motion.p>
        </div>

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
            onClick={() => {}}
            icon={<Shuffle size={20} />}
            active={false}
          />
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
          <ControlButton
            onClick={() => {}}
            icon={<Repeat size={20} />}
            active={false}
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
      } ${active ? 'text-accent' : 'text-text/70 hover:text-text'}`}
    >
      {icon}
    </motion.button>
  );
}
