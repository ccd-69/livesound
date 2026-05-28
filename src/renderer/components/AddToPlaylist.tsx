import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Loader2, Check } from 'lucide-react';

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
    window.electronAPI.loadLocalPlaylists().then((local) => {
      setPlaylists(local || []);
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
      await window.electronAPI.addTrackToLocalPlaylist(playlistId, track);
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
      const created = await window.electronAPI.createLocalPlaylist(newName.trim());
      await window.electronAPI.addTrackToLocalPlaylist(created.id, track);
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

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Add to playlist"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-muted transition-colors hover:text-accent"
      >
        <Plus size={16} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-card p-2 shadow-xl"
          >
            {playlists.length === 0 && !creating && (
              <div className="px-1 py-2 text-xs text-muted">
                No playlists yet.
              </div>
            )}
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => addTo(p.id)}
                disabled={loading}
                className="block w-full truncate rounded px-2 py-1.5 text-left text-xs text-text transition-colors hover:bg-hover"
              >
                {p.name}
              </button>
            ))}

            {!creating && (
              <button
                onClick={() => setCreating(true)}
                disabled={loading}
                className="mt-1 block w-full rounded border-t border-border px-2 py-1.5 text-left text-xs text-accent transition-colors hover:bg-hover"
              >
                + Create new playlist
              </button>
            )}

            {creating && (
              <div className="mt-2 flex gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Playlist name"
                  onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                  onMouseDown={(e) => e.stopPropagation()}
                  autoFocus
                  className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    createAndAdd();
                  }}
                  disabled={loading || !newName.trim()}
                  className="rounded bg-accent px-2 py-1 text-xs font-semibold text-black disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
