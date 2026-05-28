import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { usePlayback } from '../hooks/usePlayback';
import AddToPlaylist from '../components/AddToPlaylist';
import {
  Music,
  Tv,
  Cloud,
  ArrowLeft,
  Disc3,
  ListMusic,
  RefreshCw,
  Loader2,
  Unlink,
  Plus,
  Heart,
  FolderPlus,
} from 'lucide-react';

export default function Library() {
  const playback = usePlayback();
  const location = useLocation();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [localPlaylists, setLocalPlaylists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<'playlists' | 'albums' | 'my-playlists'>('playlists');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    loadData();
    const onVis = () => {
      if (!document.hidden) loadData();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [location.pathname]);

  const loadData = async () => {
    const s = await window.electronAPI.getSettings();
    setSettings(s);
    try {
      const cached = await window.electronAPI.loadCachedLibrary();
      setPlaylists(cached.playlists || []);
      setAlbums(cached.albums || []);
    } catch {
      // ignore
    }
    try {
      const local = await window.electronAPI.loadLocalPlaylists();
      setLocalPlaylists(local || []);
    } catch {
      // ignore
    }
  };

  const createLocalPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const playlist = await window.electronAPI.createLocalPlaylist(newPlaylistName.trim());
    setLocalPlaylists((prev) => [...prev, playlist]);
    setNewPlaylistName('');
    setShowCreateModal(false);
  };

  const deleteLocalPlaylist = async (id: string) => {
    const ok = await window.electronAPI.deleteLocalPlaylist(id);
    if (ok) {
      setLocalPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (selectedPlaylist?.id === id) {
        setSelectedPlaylist(null);
        setTracks([]);
      }
    }
  };

  const connectSpotify = async () => {
    setConnecting(true);
    try {
      await window.electronAPI.startSpotifyAuth();
      await syncSpotify();
    } catch (err: any) {
      alert(err.message || 'Failed to connect Spotify');
    } finally {
      setConnecting(false);
    }
  };

  const connectYouTube = async () => {
    setConnecting(true);
    try {
      await window.electronAPI.startYouTubeAuth();
      await syncYouTube();
    } catch (err: any) {
      alert(err.message || 'Failed to connect YouTube');
    } finally {
      setConnecting(false);
    }
  };

  const connectSoundCloud = async () => {
    setConnecting(true);
    try {
      await window.electronAPI.startSoundCloudAuth();
      await syncSoundCloud();
    } catch (err: any) {
      alert(err.message || 'Failed to connect SoundCloud');
    } finally {
      setConnecting(false);
    }
  };

  const connectSoundCloudFree = async () => {
    if (!settings.soundcloudProfileUrl) {
      alert('Please set your SoundCloud profile URL in Settings first.');
      return;
    }
    setSyncing(true);
    try {
      const data = await window.electronAPI.syncSoundCloudFree(settings.soundcloudProfileUrl);
      setPlaylists((prev) => {
        const kept = prev.filter((p) => p.source !== 'soundcloud');
        const map = new Map(kept.map((p) => [p.id, p]));
        data.playlists.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
      setTracks((prev) => {
        const kept = prev.filter((t) => t.source !== 'soundcloud');
        const map = new Map(kept.map((t) => [t.id, t]));
        (data.tracks || []).forEach((t: any) => map.set(t.id, t));
        return Array.from(map.values());
      });
    } catch (err: any) {
      alert(err.message || 'Failed to sync SoundCloud');
    } finally {
      setSyncing(false);
    }
  };

  const syncSpotify = async () => {
    setSyncing(true);
    try {
      const data = await window.electronAPI.syncSpotifyLibrary();
      setPlaylists((prev) => {
        const kept = prev.filter((p) => p.source !== 'spotify');
        const map = new Map(kept.map((p) => [p.id, p]));
        data.playlists.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
      setAlbums((prev) => {
        const kept = prev.filter((a) => a.source !== 'spotify');
        const map = new Map(kept.map((a) => [a.id, a]));
        (data.albums || []).forEach((a: any) => map.set(a.id, a));
        return Array.from(map.values());
      });
      const s = await window.electronAPI.getSettings();
      setSettings(s);
    } catch (err: any) {
      alert(err.message || 'Failed to sync Spotify');
    } finally {
      setSyncing(false);
    }
  };

  const syncYouTube = async () => {
    setSyncing(true);
    try {
      const data = await window.electronAPI.syncYouTubeLibrary();
      setPlaylists((prev) => {
        const kept = prev.filter((p) => p.source !== 'youtube');
        const map = new Map(kept.map((p) => [p.id, p]));
        data.playlists.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
      const s = await window.electronAPI.getSettings();
      setSettings(s);
    } catch (err: any) {
      alert(err.message || 'Failed to sync YouTube');
    } finally {
      setSyncing(false);
    }
  };

  const syncSoundCloud = async () => {
    setSyncing(true);
    try {
      const data = await window.electronAPI.syncSoundCloudLibrary();
      setPlaylists((prev) => {
        const kept = prev.filter((p) => p.source !== 'soundcloud');
        const map = new Map(kept.map((p) => [p.id, p]));
        data.playlists.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
      setTracks((prev) => {
        const kept = prev.filter((t) => t.source !== 'soundcloud');
        const map = new Map(kept.map((t) => [t.id, t]));
        (data.tracks || []).forEach((t: any) => map.set(t.id, t));
        return Array.from(map.values());
      });
      const s = await window.electronAPI.getSettings();
      setSettings(s);
    } catch (err: any) {
      alert(err.message || 'Failed to sync SoundCloud');
    } finally {
      setSyncing(false);
    }
  };

  const openPlaylist = async (playlist: any) => {
    setSelectedPlaylist(playlist);
    setTracks([]);
    // Local playlists have tracks already loaded
    if (playlist.source === 'local') {
      setTracks(playlist.tracks || []);
      return;
    }
    try {
      const t = await window.electronAPI.getPlaylistTracks(playlist.id, playlist.source);
      setTracks(t);
    } catch {
      // ignore
    }
  };

  const backToLibrary = () => {
    setSelectedPlaylist(null);
    setTracks([]);
  };

  const disconnect = async (service: string) => {
    if (service === 'spotify') {
      await window.electronAPI.spotifyLogout();
    } else if (service === 'youtube') {
      await window.electronAPI.youTubeLogout();
    } else if (service === 'soundcloud') {
      await window.electronAPI.soundCloudLogout();
      const next = { ...settings, soundcloudProfileUrl: '' };
      await window.electronAPI.saveSettings(next);
      setSettings(next);
    }
    const s = await window.electronAPI.getSettings();
    setSettings(s);
  };

  const connectedServices = [
    { key: 'spotify', label: 'Spotify', connected: settings.spotifyConnected, color: 'text-green-400', premiumRequired: true },
    { key: 'youtube', label: 'YouTube', connected: settings.youtubeConnected, color: 'text-red-400', premiumRequired: false },
    { key: 'soundcloud', label: 'SoundCloud', connected: settings.soundcloudConnected || settings.soundcloudProfileUrl, color: 'text-orange-400', premiumRequired: false },
  ];

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        {selectedPlaylist ? (
          <PlaylistDetail
            key="detail"
            playlist={selectedPlaylist}
            tracks={tracks}
            onBack={backToLibrary}
            playback={playback}
            loadData={loadData}
            localPlaylists={localPlaylists}
            onDelete={selectedPlaylist.source === 'local' ? deleteLocalPlaylist : undefined}
          />
        ) : (
          <motion.div
            key="library"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-accent">Library</h2>

            {/* Service Status Bar */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {connectedServices.map((svc) => {
                const connectFn =
                  svc.key === 'spotify'
                    ? connectSpotify
                    : svc.key === 'youtube'
                    ? connectYouTube
                    : settings.soundcloudConnected
                    ? syncSoundCloud
                    : connectSoundCloudFree;
                const disabled = !svc.connected && svc.premiumRequired;
                return (
                  <motion.button
                    key={svc.key}
                    whileHover={disabled ? {} : { scale: 1.03 }}
                    whileTap={disabled ? {} : { scale: 0.97 }}
                    onClick={() => {
                      if (disabled) return;
                      if (svc.connected) {
                        disconnect(svc.key);
                      } else {
                        connectFn();
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      svc.connected
                        ? 'border-accent/30 bg-accent/10 text-text cursor-pointer hover:bg-accent/20'
                        : disabled
                        ? 'border-border bg-transparent text-muted/60 cursor-not-allowed'
                        : 'border-border bg-transparent text-muted cursor-pointer hover:border-accent/50 hover:text-text'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${svc.connected ? 'bg-accent' : disabled ? 'bg-hover/50' : 'bg-hover'}`} />
                    {svc.connected ? `Disconnect ${svc.label}` : disabled ? `${svc.label} Premium Required` : `Connect ${svc.label}`}
                  </motion.button>
                );
              })}
              {syncing && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Loader2 size={12} className="animate-spin" /> Syncing...
                </span>
              )}
            </div>

            {!settings.spotifyConnected && (
              <p className="mb-4 text-xs text-muted/80">
                Spotify integration requires an active Spotify Premium subscription on the developer account. This is a Spotify platform restriction as of 2025.
              </p>
            )}

            {/* Sync buttons for connected services */}
            <div className="mb-4 flex flex-wrap gap-2">
              {settings.spotifyConnected && (
                <ActionButton onClick={syncSpotify} icon={syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}>
                  Sync Spotify
                </ActionButton>
              )}
              {settings.youtubeConnected && (
                <ActionButton onClick={syncYouTube} icon={syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}>
                  Sync YouTube
                </ActionButton>
              )}
              {(settings.soundcloudConnected || settings.soundcloudProfileUrl) && (
                <ActionButton onClick={settings.soundcloudConnected ? syncSoundCloud : connectSoundCloudFree} icon={syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}>
                  Sync SoundCloud
                </ActionButton>
              )}
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2">
              <TabButton active={tab === 'playlists'} onClick={() => setTab('playlists')} icon={<ListMusic size={16} />}>
                Playlists ({playlists.length})
              </TabButton>
              <TabButton active={tab === 'my-playlists'} onClick={() => setTab('my-playlists')} icon={<FolderPlus size={16} />}>
                My Playlists ({localPlaylists.length})
              </TabButton>
              <TabButton active={tab === 'albums'} onClick={() => setTab('albums')} icon={<Disc3 size={16} />}>
                Albums ({albums.length})
              </TabButton>
            </div>

            {tab === 'playlists' && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                {[...playlists]
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .map((p) => (
                    <PlaylistCard key={p.id} playlist={p} onClick={() => openPlaylist(p)} />
                  ))}
                {playlists.length === 0 && (
                  <p className="col-span-full text-sm text-muted">
                    No synced playlists yet. Connect a service above to import your library.
                  </p>
                )}
              </div>
            )}

            {tab === 'my-playlists' && (
              <div className="flex flex-col gap-4">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowCreateModal(true)}
                  className="flex max-w-xs items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <Plus size={18} /> Create New Playlist
                </motion.button>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                  {[...localPlaylists]
                    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                    .map((p) => (
                      <PlaylistCard key={p.id} playlist={p} onClick={() => openPlaylist(p)} />
                    ))}
                  {localPlaylists.length === 0 && (
                    <p className="col-span-full text-sm text-muted">
                      No custom playlists yet. Click "Create New Playlist" to start building cross-platform mixes.
                    </p>
                  )}
                </div>

                {showCreateModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-card p-6"
                    >
                      <h3 className="text-lg font-semibold">Create Playlist</h3>
                      <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createLocalPlaylist()}
                        placeholder="Playlist name"
                        autoFocus
                        className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={createLocalPlaylist}
                          className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-black"
                        >
                          Create
                        </motion.button>
                        <button
                          onClick={() => { setShowCreateModal(false); setNewPlaylistName(''); }}
                          className="flex-1 rounded-lg border border-border py-2 text-sm text-text hover:bg-hover"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {tab === 'albums' && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                {albums.map((a) => (
                  <AlbumCard key={a.id} album={a} />
                ))}
                {albums.length === 0 && (
                  <p className="col-span-full text-sm text-muted">No albums yet. Sync Spotify to load your saved albums.</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlaylistCard({ playlist, onClick }: { playlist: any; onClick: () => void }) {
  const isLocal = playlist.source === 'local';
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className="cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="aspect-square bg-hover overflow-hidden">
        {playlist.image ? (
          <img src={playlist.image} alt={playlist.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            {isLocal ? <FolderPlus size={32} /> : <Music size={32} />}
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="truncate text-sm font-semibold">{playlist.name}</div>
        <div className="truncate text-xs text-muted">
          {playlist.owner} ·{' '}
          {isLocal
            ? 'LiveSound'
            : playlist.source === 'spotify'
            ? 'Spotify'
            : playlist.source === 'soundcloud'
            ? 'SoundCloud'
            : 'YouTube'}
        </div>
      </div>
    </motion.div>
  );
}

function AlbumCard({ album }: { album: any }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="aspect-square bg-hover overflow-hidden">
        {album.image ? (
          <img src={album.image} alt={album.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <Disc3 size={32} />
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="truncate text-sm font-semibold">{album.name}</div>
        <div className="truncate text-xs text-muted">{album.artist}</div>
      </div>
    </motion.div>
  );
}

function PlaylistDetail({
  playlist,
  tracks,
  onBack,
  playback,
  loadData,
  localPlaylists,
  onDelete,
}: {
  playlist: any;
  tracks: any[];
  onBack: () => void;
  playback: ReturnType<typeof usePlayback>;
  loadData: () => void;
  localPlaylists: any[];
  onDelete?: (id: string) => void;
}) {
  const isLocal = playlist.source === 'local';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-text transition-colors hover:bg-hover"
        >
          <ArrowLeft size={16} /> Back
        </button>
        {isLocal && onDelete && (
          <button
            onClick={() => {
              if (confirm('Delete this playlist?')) {
                onDelete(playlist.id);
                onBack();
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete
          </button>
        )}
      </div>

      <h2 className="mb-1 text-xl font-bold text-accent">{playlist.name}</h2>
      <p className="mb-4 text-sm text-muted">
        {tracks.length} tracks ·{' '}
        {isLocal
          ? 'LiveSound'
          : playlist.source === 'spotify'
          ? 'Spotify'
          : playlist.source === 'soundcloud'
          ? 'SoundCloud'
          : 'YouTube'}
      </p>

      <div className="flex flex-col gap-1">
        {tracks.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            onClick={() => {
              // For local playlists, set queue so next/previous work
              if (isLocal || playlist.source === 'youtube' || playlist.source === 'soundcloud') {
                const idx = tracks.findIndex((qt) => qt.id === t.id);
                playback.setYoutubeQueue(tracks, idx >= 0 ? idx : 0);
              }
              playback.playTrack(t);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-hover"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-hover">
              {t.image && <img src={t.image} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.name}</div>
              <div className="truncate text-xs text-muted">
                {t.artist} ·{' '}
                {t.source === 'spotify'
                  ? 'Spotify'
                  : t.source === 'soundcloud'
                  ? 'SoundCloud'
                  : 'YouTube'}
              </div>
            </div>
            <AddToPlaylist track={t} onAdded={loadData} />
          </motion.div>
        ))}
        {tracks.length === 0 && <p className="text-sm text-muted">No tracks in this playlist yet.</p>}
      </div>
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
      {children}
    </motion.button>
  );
}

function ActionButton({
  onClick,
  children,
  icon,
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs text-text transition-colors hover:bg-hover"
    >
      {icon}
      {children}
    </motion.button>
  );
}
