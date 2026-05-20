import React, { useState, useEffect } from 'react';
import { usePlayback } from '../hooks/usePlayback';
import AddToPlaylist from '../components/AddToPlaylist';

export default function Search() {
  const playback = usePlayback();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ tracks: any[]; albums: any[]; playlists: any[] }>({
    tracks: [],
    albums: [],
    playlists: [],
  });
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
  const hasConnection = settings.spotifyConnected || settings.youtubeConnected;

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Search</h2>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tracks, albums, artists, or paste a YouTube URL..."
          disabled={!hasConnection}
          style={{
            flex: 1,
            padding: '0.6rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--card-color)',
            color: 'var(--text-color)',
            fontSize: '1rem',
            outline: 'none',
            opacity: hasConnection ? 1 : 0.5,
          }}
        />
        <button
          onClick={handleSearch}
          disabled={!hasConnection || loading}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent-color)',
            color: '#000',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: hasConnection ? 1 : 0.5,
          }}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {settings.youtubeConnected && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={musicOnly}
            onChange={(e) => setMusicOnly(e.target.checked)}
            style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
          />
          Music videos only
        </label>
      )}

      {!hasConnection && (
        <p style={{ color: 'var(--text-muted)' }}>Connect Spotify or YouTube Music in the Library to enable search.</p>
      )}

      {totalCount > 0 && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {['tracks', 'albums', 'playlists'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: activeTab === tab ? 'var(--accent-color)' : 'transparent',
                  color: activeTab === tab ? '#000' : 'var(--text-color)',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 600 : 400,
                }}
              >
                {tab[0].toUpperCase() + tab.slice(1)} ({results[tab as keyof typeof results].length})
              </button>
            ))}
          </div>

          {activeTab === 'tracks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {results.tracks.map((t) => (
                <div
                  key={`${t.source}-${t.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-color)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => playback.playTrack(t)}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'var(--hover-color)', flexShrink: 0, overflow: 'hidden' }}>
                    {t.image && <img src={t.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {t.artist} · {t.source === 'spotify' ? 'Spotify' : 'YouTube'}
                    </div>
                  </div>
                  {t.source === 'youtube' && <AddToPlaylist track={t} />}
                </div>
              ))}
              {results.tracks.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No tracks found.</p>}
            </div>
          )}

          {activeTab === 'albums' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {results.albums.map((a) => (
                <div key={`${a.source}-${a.id}`} style={{ background: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '1', background: 'var(--hover-color)', overflow: 'hidden' }}>
                    {a.image ? <img src={a.image} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>💿</div>}
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.artist}</div>
                  </div>
                </div>
              ))}
              {results.albums.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No albums found.</p>}
            </div>
          )}

          {activeTab === 'playlists' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {results.playlists.map((p) => (
                <div key={`${p.source}-${p.id}`} style={{ background: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '1', background: 'var(--hover-color)', overflow: 'hidden' }}>
                    {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>🎵</div>}
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.owner} · {p.source === 'spotify' ? 'Spotify' : 'YouTube'}</div>
                  </div>
                </div>
              ))}
              {results.playlists.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No playlists found.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
