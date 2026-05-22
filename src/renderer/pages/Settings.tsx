import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Save,
  Trash2,
  RefreshCw,
  Download,
  Info,
  Loader2,
  Music,
  Monitor,
  Activity,
  BarChart3,
  PlayCircle,
  MonitorPlay,
  Radio,
  Globe,
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [youtubeClientId, setYouTubeClientId] = useState('');
  const [youtubeClientSecret, setYouTubeClientSecret] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<{
    status: string;
    version?: string;
    error?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings(s);
      setSpotifyClientId(s.spotifyClientId || '');
      setYouTubeClientId(s.youtubeClientId || '');
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-accent">Settings</h2>

      <div className="flex max-w-lg flex-col gap-4">
        {/* Spotify */}
        <Section icon={<Music size={18} />} title="Spotify Configuration">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-muted">Client ID</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={spotifyClientId}
                onChange={(e) => setSpotifyClientId(e.target.value)}
                placeholder="Paste your Spotify Client ID"
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={saveSpotifyId}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black"
              >
                <Save size={14} /> Save
              </motion.button>
            </div>
            <p className="text-xs text-muted">
              Create an app at{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Spotify Developer Dashboard
              </a>
              . Add https://localhost:8888/callback as a Redirect URI.
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm">Status</span>
              <span className={`text-sm font-medium ${settings.spotifyConnected ? 'text-accent' : 'text-muted'}`}>
                {settings.spotifyConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            {settings.spotifyConnected && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() =>
                  window.electronAPI.spotifyLogout().then(() =>
                    setSettings((s: any) => ({ ...s, spotifyConnected: false }))
                  )
                }
                className="mt-1 w-full rounded-lg border border-border py-2 text-sm text-text transition-colors hover:bg-hover"
              >
                Disconnect Spotify
              </motion.button>
            )}
          </div>
        </Section>

        {/* YouTube */}
        <Section icon={<Monitor size={18} />} title="YouTube Music Configuration">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-muted">Client ID</label>
            <input
              type="password"
              value={youtubeClientId}
              onChange={(e) => setYouTubeClientId(e.target.value)}
              placeholder="Paste your Google Client ID"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
            <label className="text-xs font-medium text-muted">Client Secret</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={youtubeClientSecret}
                onChange={(e) => setYouTubeClientSecret(e.target.value)}
                placeholder="Paste your Google Client Secret"
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={saveYouTubeCreds}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black"
              >
                <Save size={14} /> Save
              </motion.button>
            </div>
            <p className="text-xs text-muted">
              Create OAuth 2.0 credentials at{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Google Cloud Console
              </a>
              . Add https://localhost:8889/callback as an authorized redirect URI and enable the YouTube Data API v3.
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm">Status</span>
              <span className={`text-sm font-medium ${settings.youtubeConnected ? 'text-accent' : 'text-muted'}`}>
                {settings.youtubeConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            {settings.youtubeConnected && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() =>
                  window.electronAPI.youTubeLogout().then(() =>
                    setSettings((s: any) => ({ ...s, youtubeConnected: false }))
                  )
                }
                className="mt-1 w-full rounded-lg border border-border py-2 text-sm text-text transition-colors hover:bg-hover"
              >
                Disconnect YouTube
              </motion.button>
            )}
          </div>
        </Section>

        {/* Playback */}
        <Section icon={<RefreshCw size={18} />} title="Playback">
          <div className="flex items-center gap-3">
            <label className="text-sm">Volume</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.volume ?? 0.8}
              onChange={(e) => update('volume', parseFloat(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="min-w-[40px] text-right text-sm tabular-nums">
              {Math.round((settings.volume ?? 0.8) * 100)}%
            </span>
          </div>
        </Section>

        {/* YouTube Playback Mode */}
        <Section icon={<PlayCircle size={18} />} title="YouTube Playback Mode">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted mb-1">Choose how YouTube content is played inside the app.</p>
            {[
              { key: 'iframe', label: 'IFrame Player', desc: 'Official YouTube embed. Most reliable.' },
              { key: 'ytm-web', label: 'YouTube Music Web', desc: 'Full YouTube Music website with playlists.' },
              { key: 'direct-stream', label: 'Direct Stream', desc: 'Extract audio URL. Custom UI, no ads.' },
              { key: 'webview', label: 'WebView', desc: 'Lightweight embedded player.' },
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => update('youtubePlaybackMode', mode.key)}
                className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                  settings.youtubePlaybackMode === mode.key
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-transparent hover:bg-hover'
                }`}
              >
                <span className={`text-sm font-medium ${settings.youtubePlaybackMode === mode.key ? 'text-accent' : 'text-text'}`}>
                  {mode.label}
                </span>
                <span className="text-xs text-muted">{mode.desc}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Visualizers */}
        <Section icon={<Activity size={18} />} title="Visualizers">
          <div className="flex flex-col gap-3">
            <ToggleRow
              label="Show Animated Equalizer"
              description="Display an animated equalizer in the player bar when music is playing"
              checked={settings.showEqualizer ?? false}
              onChange={(v) => update('showEqualizer', v)}
            />
            <ToggleRow
              label="Show Spectrum Analyzer"
              description="Display a spectrum analyzer on the Now Playing screen"
              checked={settings.showSpectrumAnalyzer ?? false}
              onChange={(v) => update('showSpectrumAnalyzer', v)}
            />
          </div>
        </Section>

        {/* Cache */}
        <Section icon={<Trash2 size={18} />} title="Cache">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={clearAllCache}
            className="w-full rounded-lg border border-border py-2 text-sm text-text transition-colors hover:bg-hover"
          >
            Clear All Cache
          </motion.button>
        </Section>

        {/* Updates */}
        <Section icon={<Download size={18} />} title="Updates">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              Current version: <span className="text-text">{appVersion || '1.0.0'}</span>
            </p>
            <p className="text-xs text-muted">{getUpdateStatusText()}</p>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.electronAPI.checkForUpdates()}
                disabled={updateStatus.status === 'checking'}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {updateStatus.status === 'checking' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Checking...
                  </span>
                ) : (
                  'Check for Updates'
                )}
              </motion.button>
              {updateStatus.status === 'downloaded' && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => window.electronAPI.installUpdate()}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black"
                >
                  Install & Restart
                </motion.button>
              )}
            </div>
          </div>
        </Section>

        {/* About */}
        <Section icon={<Info size={18} />} title="About">
          <p className="text-sm text-muted">
            LiveSound v1.0.2 — Personal unified media player for Spotify and YouTube Music.
          </p>
        </Section>
      </div>
    </motion.div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="text-xs text-muted">{description}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-hover'
        }`}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-card p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      {children}
    </motion.div>
  );
}
