import React from 'react';
import { usePlayback } from '../hooks/usePlayback';

function formatTime(ms: number) {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
  const playback = usePlayback();

  return (
    <div
      style={{
        height: '80px',
        background: 'var(--card-color)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          background: 'var(--hover-color)',
          borderRadius: '6px',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {playback.currentTrack?.album?.images?.[0]?.url && (
          <img
            src={playback.currentTrack.album.images[0].url}
            alt="Album art"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {playback.currentTrack?.name || 'No track selected'}
        </div>
        <div
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {playback.currentTrack?.artists?.map((a: any) => a.name).join(', ') || 'Select a track to play'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button style={btnStyle} onClick={playback.previous}>⏮</button>
        <button
          style={{ ...btnStyle, fontSize: '1.4rem' }}
          onClick={playback.toggle}
        >
          {playback.isPlaying ? '⏸' : '▶'}
        </button>
        <button style={btnStyle} onClick={playback.next}>⏭</button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            minWidth: '32px',
          }}
        >
          {formatTime(playback.progress)}
        </span>
        <input
          type="range"
          min={0}
          max={playback.duration || 100}
          value={playback.progress}
          onChange={(e) => playback.seek(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--accent-color)' }}
        />
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            minWidth: '32px',
          }}
        >
          {formatTime(playback.duration)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: '120px',
        }}
      >
        <span>🔊</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={playback.volume}
          onChange={(e) => playback.setVolume(parseFloat(e.target.value))}
          style={{ width: '80px', accentColor: 'var(--accent-color)' }}
        />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-color)',
  fontSize: '1.1rem',
  cursor: 'pointer',
  padding: '0.25rem',
};
