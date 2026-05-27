import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayback } from '../hooks/usePlayback';
import AddToPlaylist from '../components/AddToPlaylist';
import {
  Search as SearchIcon,
  Loader2,
  Music,
  Disc3,
  ListMusic,
  Disc,
} from 'lucide-react';

export default function Search() {
  const playback = usePlayback();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    tracks: any[];
    albums: any[];
    playlists: any[];
  }>({ tracks: [], albums: [], playlists: [] });
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums' | 'playlists'>('tracks');
  const [musicOnly, setMusicOnly] = useState(false);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.searchAll(query.trim(), musicOnly);
      setResults(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const totalCount = results.tracks.length + results.albums.length + results.playlists.length;
  const hasConnection = settings.spotifyConnected || settings.youtubeConnected || settings.soundcloudConnected;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-accent">Search</h2>

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tracks, albums, artists, or paste a YouTube URL..."
            disabled={!hasConnection}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-accent disabled:opacity-50"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSearch}
          disabled={!hasConnection || loading}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
        </motion.button>
      </div>

      {settings.youtubeConnected && (
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={musicOnly}
            onChange={(e) => setMusicOnly(e.target.checked)}
            className="accent-accent cursor-pointer"
          />
          Music videos only
        </label>
      )}

      {!hasConnection && (
        <p className="text-sm text-muted">Connect Spotify, YouTube Music, or SoundCloud in the Library to enable search.</p>
      )}

      <AnimatePresence>
        {totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex gap-2">
              {(['tracks', 'albums', 'playlists'] as const).map((tab) => (
                <TabChip
                  key={tab}
                  active={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  count={results[tab].length}
                  icon={
                    tab === 'tracks' ? <Music size={14} /> : tab === 'albums' ? <Disc3 size={14} /> : <ListMusic size={14} />
                  }
                >
                  {tab[0].toUpperCase() + tab.slice(1)}
                </TabChip>
              ))}
            </div>

            {activeTab === 'tracks' && (
              <div className="flex flex-col gap-1">
                {results.tracks.map((t, i) => (
                  <motion.div
                    key={`${t.source}-${t.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    onClick={() => playback.playTrack(t)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-hover"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-hover">
                      {t.image ? (
                        <img src={t.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Disc size={18} className="text-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.name}</div>
                      <div className="truncate text-xs text-muted">
                        {t.artist} ·{' '}
                        {t.source === 'spotify' ? 'Spotify' : t.source === 'soundcloud' ? 'SoundCloud' : 'YouTube'}
                      </div>
                    </div>
                    {(t.source === 'youtube' || t.source === 'soundcloud') && <AddToPlaylist track={t} />}
                  </motion.div>
                ))}
                {results.tracks.length === 0 && <p className="text-sm text-muted">No tracks found.</p>}
              </div>
            )}

            {activeTab === 'albums' && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                {results.albums.map((a) => (
                  <motion.div
                    key={`${a.source}-${a.id}`}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
                  >
                    <div className="aspect-square bg-hover overflow-hidden">
                      {a.image ? (
                        <img src={a.image} alt={a.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-muted">
                          <Disc3 size={32} />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="truncate text-sm font-semibold">{a.name}</div>
                      <div className="truncate text-xs text-muted">{a.artist}</div>
                    </div>
                  </motion.div>
                ))}
                {results.albums.length === 0 && <p className="col-span-full text-sm text-muted">No albums found.</p>}
              </div>
            )}

            {activeTab === 'playlists' && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                {results.playlists.map((p) => (
                  <motion.div
                    key={`${p.source}-${p.id}`}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
                  >
                    <div className="aspect-square bg-hover overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-muted">
                          <ListMusic size={32} />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="truncate text-xs text-muted">
                        {p.owner} ·{' '}
                        {p.source === 'spotify' ? 'Spotify' : p.source === 'soundcloud' ? 'SoundCloud' : 'YouTube'}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {results.playlists.length === 0 && <p className="col-span-full text-sm text-muted">No playlists found.</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TabChip({
  active,
  onClick,
  children,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-accent bg-accent text-black'
          : 'border-border bg-transparent text-text hover:bg-hover'
      }`}
    >
      {icon}
      {children} ({count})
    </motion.button>
  );
}
