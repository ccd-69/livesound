import React, { useEffect, useState } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [youtubeClientId, setYouTubeClientId] = useState('');
  const [youtubeClientSecret, setYouTubeClientSecret] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<{ status: string; version?: string; error?: string }>({ status: 'idle' });

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s);
      setSpotifyClientId(s.spotifyClientId || '');
      setYouTubeClientId(s.youtubeClientId || '');
      // Client secret is never sent to the renderer; keep field empty
    });
    window.electronAPI.getAppVersion().then(setAppVersion);
    window.electronAPI.getUpdateStatus().then(setUpdateStatus);
  }, []);

  useEffect(() => {
    const unsub = window.electronAPI.onUpdateStatus((payload) => {
      setUpdateStatus(payload);
    });
    return () => unsub();
  }, []);

  const update = (key: string, value: any) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    window.electronAPI.saveSettings(next);
  };

  const saveSpotifyId = () => {
    if (!spotifyClientId.trim()) return;
    update('spotifyClientId', spotifyClientId.trim());
    window.electronAPI.setSpotifyClientId(spotifyClientId.trim());
  };

  const saveYouTubeCreds = () => {
    const next: any = { ...settings, youtubeClientId: youtubeClientId.trim() };
    if (youtubeClientSecret.trim()) {
      next.youtubeClientSecret = youtubeClientSecret.trim();
    }
    setSettings(next);
    window.electronAPI.saveSettings(next);
    if (youtubeClientId.trim() && youtubeClientSecret.trim()) {
      window.electronAPI.setYouTubeCredentials(youtubeClientId.trim(), youtubeClientSecret.trim());
    }
  };

  const clearAllCache = async () => {
    await window.electronAPI.clearCache();
    alert('Cache cleared.');
  };

  const getUpdateStatusText = () => {
    switch (updateStatus.status) {
      case 'checking':
        return 'Checking for updates...';
      case 'available':
        return `Update available: v${updateStatus.version} (downloading...)`;
      case 'downloaded':
        return `Update v${updateStatus.version} is ready to install.`;
      case 'error':
        return `Update check failed: ${updateStatus.error || 'Unknown error'}`;
      case 'not-available':
      default:
        return 'You are on the latest version.';
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Settings</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '520px' }}>
        {/* Spotify */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: '0.75rem' }}>Spotify Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Client ID</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                value={spotifyClientId}
                onChange={(e) => setSpotifyClientId(e.target.value)}
                placeholder="Paste your Spotify Client ID"
                style={inputStyle}
              />
              <button onClick={saveSpotifyId} style={btnPrimaryStyle}>Save</button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Create an app at{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)' }}>
                Spotify Developer Dashboard
              </a>
              . Add https://localhost:8888/callback as a Redirect URI.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <span>Status</span>
            <span style={{ color: settings.spotifyConnected ? 'var(--accent-color)' : 'var(--text-muted)' }}>
              {settings.spotifyConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          {settings.spotifyConnected && (
            <button
              onClick={() => window.electronAPI.spotifyLogout().then(() => setSettings((s: any) => ({ ...s, spotifyConnected: false })))}
              style={{ ...btnSecondaryStyle, marginTop: '0.75rem', width: '100%' }}
            >
              Disconnect Spotify
            </button>
          )}
        </div>

        {/* YouTube */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: '0.75rem' }}>YouTube Music Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Client ID</label>
            <input
              type="password"
              value={youtubeClientId}
              onChange={(e) => setYouTubeClientId(e.target.value)}
              placeholder="Paste your Google Client ID"
              style={inputStyle}
            />
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Client Secret</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                value={youtubeClientSecret}
                onChange={(e) => setYouTubeClientSecret(e.target.value)}
                placeholder="Paste your Google Client Secret"
                style={inputStyle}
              />
              <button onClick={saveYouTubeCreds} style={btnPrimaryStyle}>Save</button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Create OAuth 2.0 credentials at{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)' }}>
                Google Cloud Console
              </a>
              . Add https://localhost:8889/callback as an authorized redirect URI and enable the YouTube Data API v3.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <span>Status</span>
            <span style={{ color: settings.youtubeConnected ? 'var(--accent-color)' : 'var(--text-muted)' }}>
              {settings.youtubeConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          {settings.youtubeConnected && (
            <button
              onClick={() => window.electronAPI.youTubeLogout().then(() => setSettings((s: any) => ({ ...s, youtubeConnected: false })))}
              style={{ ...btnSecondaryStyle, marginTop: '0.75rem', width: '100%' }}
            >
              Disconnect YouTube
            </button>
          )}
        </div>

        {/* Playback */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: '0.75rem' }}>Playback</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem' }}>Volume</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.volume ?? 0.8}
              onChange={(e) => update('volume', parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.85rem', minWidth: '40px', textAlign: 'right' }}>
              {Math.round(((settings.volume ?? 0.8) * 100))}%
            </span>
          </div>
        </div>

        {/* Cache */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: '0.75rem' }}>Cache</h3>
          <button onClick={clearAllCache} style={{ ...btnSecondaryStyle, width: '100%' }}>Clear All Cache</button>
        </div>

        {/* Updates */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: '0.75rem' }}>Updates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Current version: <span style={{ color: 'var(--text-color)' }}>{appVersion || '1.0.0'}</span>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{getUpdateStatusText()}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => window.electronAPI.checkForUpdates()}
                disabled={updateStatus.status === 'checking'}
                style={btnPrimaryStyle}
              >
                {updateStatus.status === 'checking' ? 'Checking...' : 'Check for Updates'}
              </button>
              {updateStatus.status === 'downloaded' && (
                <button
                  onClick={() => window.electronAPI.installUpdate()}
                  style={btnPrimaryStyle}
                >
                  Install & Restart
                </button>
              )}
            </div>
          </div>
        </div>

        {/* About */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: '0.75rem' }}>About</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>LiveSound v1.0.0 — Personal unified media player for Spotify and YouTube Music.</p>
        </div>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--card-color)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '1rem',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-color)',
  color: 'var(--text-color)',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
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
