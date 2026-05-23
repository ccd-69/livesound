import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const CONFIG_PATH = path.join(app.getPath('userData'), 'livesound-config.json');

const DEFAULT_SETTINGS = {
  theme: 'void',
  accentColor: '#ffcc00',
  volume: 0.8,
  spotifyConnected: false,
  youtubeConnected: false,
  showEqualizer: false,
  showSpectrumAnalyzer: false,
  youtubePlaybackMode: 'iframe' as 'iframe' | 'ytm-web' | 'direct-stream' | 'webview',
};

export function loadSettings(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Record<string, any>) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2));
  } catch {
    // ignore
  }
}
