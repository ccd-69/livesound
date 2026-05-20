import React, { useEffect, useState } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import { useLocation } from 'react-router-dom';
import AddToPlaylist from '../components/AddToPlaylist';

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

  if (selectedPlaylist) {
    return (
      <div>
        <button onClick={backToLibrary} style={{ ...btnSecondaryStyle, marginBottom: '1rem' }}>← Back</button>
        <h2 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>{selectedPlaylist.name}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {selectedPlaylist.trackCount} tracks · {selectedPlaylist.source === 'spotify' ? 'Spotify' : 'YouTube'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tracks.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-color)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onClick={() => playback.playTrack(t)}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '4px',
                  background: 'var(--hover-color)',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {t.image && <img src={t.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</div>
              </div>
              {t.source === 'youtube' && <AddToPlaylist track={t} onAdded={loadData} />}
            </div>
          ))}
          {tracks.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Loading tracks...</p>}
        </div>
      </div>
    );
  }

  const hasAnyConnection = settings.spotifyConnected || settings.youtubeConnected;

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Library</h2>

      {!hasAnyConnection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>
            <h3>Connect Spotify</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Sign in with Spotify to play music and sync your library. Requires Premium.
            </p>
            <button onClick={connectSpotify} disabled={connecting} style={btnPrimaryStyle}>
              {connecting ? 'Connecting...' : 'Connect Spotify'}
            </button>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📺</div>
            <h3>Connect YouTube Music</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Sign in with Google to sync your YouTube playlists and liked videos.
            </p>
            <button onClick={connectYouTube} disabled={connecting} style={btnPrimaryStyle}>
              {connecting ? 'Connecting...' : 'Connect YouTube'}
            </button>
          </div>
        </div>
      )}

      {hasAnyConnection && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {settings.spotifyConnected && (
              <button onClick={() => disconnect('spotify')} style={btnSecondaryStyle}>Disconnect Spotify</button>
            )}
            {settings.youtubeConnected && (
              <button onClick={() => disconnect('youtube')} style={btnSecondaryStyle}>Disconnect YouTube</button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              onClick={() => setTab('playlists')}
              style={{
                ...btnSecondaryStyle,
                background: tab === 'playlists' ? 'var(--accent-color)' : 'transparent',
                color: tab === 'playlists' ? '#000' : 'var(--text-color)',
              }}
            >
              Playlists ({playlists.length})
            </button>
            <button
              onClick={() => setTab('albums')}
              style={{
                ...btnSecondaryStyle,
                background: tab === 'albums' ? 'var(--accent-color)' : 'transparent',
                color: tab === 'albums' ? '#000' : 'var(--text-color)',
              }}
            >
              Albums ({albums.length})
            </button>
          </div>

          {tab === 'playlists' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {[...playlists].sort((a, b) => {
                const aTime = a.createdAt || 0;
                const bTime = b.createdAt || 0;
                return bTime - aTime;
              }).map((p) => (
                <div
                  key={p.id}
                  onClick={() => openPlaylist(p)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--card-color)',
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <div style={{ aspectRatio: '1', background: 'var(--hover-color)', overflow: 'hidden' }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>🎵</div>
                    )}
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.owner} · {p.source === 'spotify' ? 'Spotify' : 'YouTube'}
                    </div>
                  </div>
                </div>
              ))}
              {playlists.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No playlists yet. Sync a service to load your library.</p>}
            </div>
          )}

          {tab === 'albums' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {albums.map((a) => (
                <div
                  key={a.id}
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--card-color)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ aspectRatio: '1', background: 'var(--hover-color)', overflow: 'hidden' }}>
                    {a.image ? (
                      <img src={a.image} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>💿</div>
                    )}
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.artist}</div>
                  </div>
                </div>
              ))}
              {albums.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No albums yet. Sync Spotify to load your saved albums.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card-color)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '2rem',
  textAlign: 'center',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '0.6rem 1.5rem',
  borderRadius: '8px',
  border: 'none',
  background: 'var(--accent-color)',
  color: '#000',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  background: 'transparent',
  color: 'var(--text-color)',
  cursor: 'pointer',
};
