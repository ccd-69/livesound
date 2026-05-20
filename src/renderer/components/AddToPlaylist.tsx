import React, { useState, useEffect, useRef } from 'react';

interface Props {
  track: any;
  onAdded?: () => void;
}

export default function AddToPlaylist({ track, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    window.electronAPI.loadCachedLibrary().then((lib) => {
      setPlaylists((lib.playlists || []).filter((p: any) => p.source === 'youtube'));
    });
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const addTo = async (playlistId: string) => {
    if (!track.id) return;
    setLoading(true);
    try {
      await window.electronAPI.addToYouTubePlaylist(playlistId, track.id);
      onAdded?.();
      setOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add to playlist');
    } finally {
      setLoading(false);
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim() || !track.id) return;
    setLoading(true);
    try {
      const created = await window.electronAPI.createYouTubePlaylist(newName.trim());
      await window.electronAPI.addToYouTubePlaylist(created.id, track.id);
      // Directly insert the new playlist into cache so it appears immediately
      await window.electronAPI.appendPlaylist({
        id: created.id,
        name: created.name || newName.trim(),
        owner: 'You',
        image: created.image || track.image || '',
        source: 'youtube',
        trackCount: 1,
        createdAt: Date.now(),
      });
      onAdded?.();
      setOpen(false);
      setCreating(false);
      setNewName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  if (track.source !== 'youtube') return null;

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Add to playlist"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '0.25rem',
          lineHeight: 1,
        }}
      >
        +
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 50,
            background: 'var(--card-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.5rem',
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {playlists.length === 0 && !creating && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.25rem' }}>
              No YouTube playlists yet.
            </div>
          )}
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => addTo(p.id)}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                padding: '0.4rem 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-color)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {p.name}
            </button>
          ))}

          {!creating && (
            <button
              onClick={() => setCreating(true)}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-color)',
                padding: '0.4rem 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                marginTop: '0.25rem',
                borderTop: '1px solid var(--border-color)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-color)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              + Create new playlist
            </button>
          )}

          {creating && (
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name"
                onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                onMouseDown={(e) => e.stopPropagation()}
                autoFocus
                style={{
                  flex: 1,
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-color)',
                  fontSize: '0.85rem',
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  createAndAdd();
                }}
                disabled={loading || !newName.trim()}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'var(--accent-color)',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {loading ? '...' : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
