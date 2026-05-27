import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const CONFIG_PATH = path.join(app.getPath('userData'), 'livesound-config.json');
const SETTINGS_VERSION = 1;

const DEFAULT_SETTINGS = {
  __version: SETTINGS_VERSION,
  theme: 'void',
  accentColor: '#ffcc00',
  volume: 0.8,
  spotifyConnected: false,
  youtubeConnected: false,
  soundcloudConnected: false,
  showEqualizer: false,
  showSpectrumAnalyzer: false,
  youtubePlaybackMode: 'iframe' as 'iframe' | 'ytm-web' | 'direct-stream' | 'webview',
};

function migrateSettings(settings: Record<string, any>): Record<string, any> {
  const currentVersion = settings.__version || 0;
  
  if (currentVersion < 1) {
    // v1 migration: ensure all new fields have defaults
    if (settings.youtubePlaybackMode === undefined) {
      settings.youtubePlaybackMode = 'iframe';
    }
    if (settings.showSpectrumAnalyzer === undefined) {
      settings.showSpectrumAnalyzer = false;
    }
  }
  
  settings.__version = SETTINGS_VERSION;
  return settings;
}

export function loadSettings(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        return migrateSettings(merged);
      }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Record<string, any>) {
  try {
    const settingsWithVersion = { ...settings, __version: SETTINGS_VERSION };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(settingsWithVersion, null, 2));
  } catch {
    // ignore
  }
}
