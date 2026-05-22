import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { usePlayback } from '../hooks/usePlayback';
import AddToPlaylist from '../components/AddToPlaylist';
import {
  Music,
  Tv,
  ArrowLeft,
  Disc3,
  ListMusic,
  RefreshCw,
  Loader2,
  Unlink,
} from 'lucide-react';

export default function Library() {
  const playback = usePlayback();
  const location = useLocation();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<'playlists' | 'albums'>('playlists');

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

  const openPlaylist = async (playlist: any) => {
    setSelectedPlaylist(playlist);
    setTracks([]);
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
    } else {
      await window.electronAPI.youTubeLogout();
    }
    const s = await window.electronAPI.getSettings();
    setSettings(s);
  };

  const hasAnyConnection = settings.spotifyConnected || settings.youtubeConnected;

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

            {!hasAnyConnection && (
              <div className="flex max-w-md flex-col gap-4">
                <ConnectCard
                  icon={<Music size={28} />}
                  title="Connect Spotify"
                  description="Sign in with Spotify to play music and sync your library. Requires Premium."
                  onConnect={connectSpotify}
                  connecting={connecting}
                />
                <ConnectCard
                  icon={<Tv size={28} />}
                  title="Connect YouTube Music"
                  description="Sign in with Google to sync your YouTube playlists and liked videos."
                  onConnect={connectYouTube}
                  connecting={connecting}
                />
              </div>
            )}

            {hasAnyConnection && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {settings.spotifyConnected && (
                    <ActionButton onClick={() => disconnect('spotify')} icon={<Unlink size={14} />}>
                      Disconnect Spotify
                    </ActionButton>
                  )}
                  {settings.youtubeConnected && (
                    <ActionButton onClick={() => disconnect('youtube')} icon={<Unlink size={14} />}>
                      Disconnect YouTube
                    </ActionButton>
                  )}
                  <ActionButton onClick={syncSpotify} icon={syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}>
                    {syncing ? 'Syncing...' : 'Sync'}
                  </ActionButton>
                </div>

                <div className="mb-4 flex gap-2">
                  <TabButton active={tab === 'playlists'} onClick={() => setTab('playlists')} icon={<ListMusic size={16} />}>
                    Playlists ({playlists.length})
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
                        No playlists yet. Sync a service to load your library.
                      </p>
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlaylistCard({ playlist, onClick }: { playlist: any; onClick: () => void }) {
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
            <Music size={32} />
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="truncate text-sm font-semibold">{playlist.name}</div>
        <div className="truncate text-xs text-muted">
          {playlist.owner} · {playlist.source === 'spotify' ? 'Spotify' : 'YouTube'}
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
}: {
  playlist: any;
  tracks: any[];
  onBack: () => void;
  playback: ReturnType<typeof usePlayback>;
  loadData: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-text transition-colors hover:bg-hover"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="mb-1 text-xl font-bold text-accent">{playlist.name}</h2>
      <p className="mb-4 text-sm text-muted">
        {playlist.trackCount} tracks · {playlist.source === 'spotify' ? 'Spotify' : 'YouTube'}
      </p>

      <div className="flex flex-col gap-1">
        {tracks.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            onClick={() => {
            if (playlist.source === 'youtube') {
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
              <div className="truncate text-xs text-muted">{t.artist}</div>
            </div>
            {t.source === 'youtube' && <AddToPlaylist track={t} onAdded={loadData} />}
          </motion.div>
        ))}
        {tracks.length === 0 && <p className="text-sm text-muted">Loading tracks...</p>}
      </div>
    </motion.div>
  );
}

function ConnectCard({
  icon,
  title,
  description,
  onConnect,
  connecting,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onConnect: () => void;
  connecting: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-border bg-card p-6 text-center transition-shadow hover:shadow-lg"
    >
      <div className="mb-3 inline-flex items-center justify-center rounded-full bg-hover p-3 text-accent">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted">{description}</p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onConnect}
        disabled={connecting}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {connecting ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Connecting...
          </span>
        ) : (
          `Connect ${title.split(' ')[1]}`
        )}
      </motion.button>
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
