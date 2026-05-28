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
  const [platforms, setPlatforms] = useState({
    spotify: true,
    youtube: true,
    soundcloud: true,
  });

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s);
      // Default platforms based on auth state
      setPlatforms({
        spotify: !!s.spotifyConnected,
        youtube: !!s.youtubeConnected,
        soundcloud: true, // always available via free API
      });
    });
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.searchAll(query.trim(), musicOnly, platforms);
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

  const togglePlatform = (key: keyof typeof platforms) => {
    setPlatforms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalCount = results.tracks.length + results.albums.length + results.playlists.length;

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
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSearch}
          disabled={loading}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
        </motion.button>
      </div>

      {/* Platform filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Platforms:</span>
        {(
          [
            { key: 'spotify', label: 'Spotify', color: 'text-green-400', border: 'border-green-400/30', needsAuth: true },
            { key: 'youtube', label: 'YouTube', color: 'text-red-400', border: 'border-red-400/30', needsAuth: true },
            { key: 'soundcloud', label: 'SoundCloud', color: 'text-orange-400', border: 'border-orange-400/30', needsAuth: false },
          ] as const
        ).map((p) => {
          const connected = p.needsAuth ? !!settings[`${p.key}Connected`] : true;
          const disabled = !connected;
          return (
            <button
              key={p.key}
              onClick={() => !disabled && togglePlatform(p.key)}
              title={disabled ? `Connect ${p.label} in Library to enable search` : ''}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                disabled
                  ? 'cursor-not-allowed border-border bg-transparent text-muted/50'
                  : platforms[p.key]
                  ? `${p.border} bg-accent/10 ${p.color}`
                  : 'border-border bg-transparent text-muted'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${platforms[p.key] && !disabled ? 'bg-current' : 'bg-hover'}`} />
              {p.label}
              {disabled && <span className="ml-0.5 text-[10px] opacity-60">(connect)</span>}
            </button>
          );
        })}
        {settings.youtubeConnected && (
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={musicOnly}
              onChange={(e) => setMusicOnly(e.target.checked)}
              className="accent-accent cursor-pointer"
            />
            Music only
          </label>
        )}
      </div>

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
                        <img src={t.image} alt="" className="h-full w-full object-cover" loading="lazy" />
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
                    <AddToPlaylist track={t} />
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
                        <img src={a.image} alt={a.name} className="h-full w-full object-cover" loading="lazy" />
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
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
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
