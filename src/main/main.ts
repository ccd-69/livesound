import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSettings, saveSettings } from './store/settings.js';
import * as spotify from './auth/spotify.js';
import * as youtube from './auth/youtube.js';
import * as spotifyApi from './api/spotify.js';
import * as youtubeApi from './api/youtube.js';
import * as cache from './db/cache.js';
import * as updater from './updater.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(import.meta.dirname, 'preload.js'),
    },
  });

  updater.setWindow(mainWindow);
  updater.sendCurrentStatus();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray on close for all platforms
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
    // On macOS, also hide from dock when window is hidden
    if (process.platform === 'darwin') {
      app.dock?.hide();
    }
  });

  // Sync when window is shown from tray/minimized
  mainWindow.on('show', async () => {
    if (process.platform === 'darwin') {
      app.dock?.show();
    }
    if (spotify.isAuthenticated()) {
      try {
        const [playlists, albums] = await Promise.all([
          spotifyApi.getMyPlaylists(),
          spotifyApi.getSavedAlbums(),
        ]);
        cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'spotify' })), 'spotify');
        cache.saveAlbums(albums.map((a) => ({ ...a, source: 'spotify' })), 'spotify');
      } catch {
        // ignore
      }
    }
    if (youtube.isAuthenticated()) {
      try {
        const playlists = await youtubeApi.getMyPlaylists();
        cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'youtube' })), 'youtube');
      } catch {
        // ignore
      }
    }
  });
}

function getTrayIcon(): Electron.NativeImage {
  // Look for tray icon in standard locations for cross-platform packaging
  const candidates = [
    path.join(app.getAppPath(), 'build/tray.png'),
    path.join(app.getAppPath(), 'assets/tray.png'),
    path.join(__dirname, '../../build/tray.png'),
    path.join(__dirname, '../../assets/tray.png'),
  ];
  for (const p of candidates) {
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) {
      if (process.platform === 'darwin') {
        return img.resize({ width: 16, height: 16 });
      }
      if (process.platform === 'linux') {
        return img.resize({ width: 22, height: 22 });
      }
      return img.resize({ width: 16, height: 16 });
    }
  }
  // Fallback to a generated 16x16 colored square so tray isn't invisible
  const size = process.platform === 'linux' ? 22 : 16;
  const buffer = generateFallbackIcon(size);
  return nativeImage.createFromBuffer(buffer);
}

function generateFallbackIcon(size: number): Buffer {
  // Minimal 1-bit BMP-like PNG would be complex; emit a tiny 1x1 transparent PNG
  // This is a valid 1x1 transparent PNG generated inline
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
}

function createTray() {
  const icon = getTrayIcon();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show LiveSound',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Play/Pause',
      click: () => {
        mainWindow?.webContents.send('media-play-pause');
      },
    },
    {
      label: 'Next Track',
      click: () => {
        mainWindow?.webContents.send('media-next');
      },
    },
    {
      label: 'Previous Track',
      click: () => {
        mainWindow?.webContents.send('media-previous');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        tray?.destroy();
        app.quit();
      },
    },
  ]);

  tray.setToolTip('LiveSound');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

app.whenReady().then(() => {
  // Restore saved credentials into auth modules on startup
  const startupSettings = loadSettings();
  if (startupSettings.spotifyClientId) {
    spotify.setClientId(startupSettings.spotifyClientId);
  }
  if (startupSettings.youtubeClientId && startupSettings.youtubeClientSecret) {
    youtube.setClientCredentials(startupSettings.youtubeClientId, startupSettings.youtubeClientSecret);
  }

  createWindow();
  createTray();

  // Wire up auto-updater and check silently on launch (skip in dev)
  if (mainWindow && !isDev) {
    updater.setWindow(mainWindow);
    updater.sendCurrentStatus();
    updater.checkForUpdates().catch(() => {});
  }

  // Startup sync: pull latest library data immediately on launch
  (async () => {
    if (spotify.isAuthenticated()) {
      try {
        const [playlists, albums] = await Promise.all([
          spotifyApi.getMyPlaylists(),
          spotifyApi.getSavedAlbums(),
        ]);
        cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'spotify' })), 'spotify');
        cache.saveAlbums(albums.map((a) => ({ ...a, source: 'spotify' })), 'spotify');
      } catch {
        // ignore
      }
    }
    if (youtube.isAuthenticated()) {
      try {
        const playlists = await youtubeApi.getMyPlaylists();
        cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'youtube' })), 'youtube');
      } catch {
        // ignore
      }
    }
  })();

  // Global media key shortcuts
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow?.webContents.send('media-play-pause');
  });
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow?.webContents.send('media-next');
  });
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow?.webContents.send('media-previous');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Periodic background sync every 5 minutes
  setInterval(async () => {
    if (youtube.isAuthenticated()) {
      try {
        const playlists = await youtubeApi.getMyPlaylists();
        cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'youtube' })), 'youtube');
      } catch {
        // ignore
      }
    }
    if (spotify.isAuthenticated()) {
      try {
        const [playlists, albums] = await Promise.all([
          spotifyApi.getMyPlaylists(),
          spotifyApi.getSavedAlbums(),
        ]);
        cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'spotify' })), 'spotify');
        cache.saveAlbums(albums.map((a) => ({ ...a, source: 'spotify' })), 'spotify');
      } catch {
        // ignore
      }
    }
  }, 300000);
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    // On Windows/Linux we keep tray running; user quits via tray menu
  }
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
});

// Settings IPC
ipcMain.handle('get-settings', () => {
  const settings = loadSettings();
  // Override stale booleans if token files are actually missing
  // Never send secrets to the renderer
  const { youtubeClientSecret: _, ...safeSettings } = settings;
  return {
    ...safeSettings,
    spotifyConnected: settings.spotifyConnected && spotify.hasTokens(),
    youtubeConnected: settings.youtubeConnected && youtube.hasTokens(),
  };
});
ipcMain.handle('save-settings', (_event, incoming) => {
  const existing = loadSettings();
  const merged = { ...existing, ...incoming };
  // Prevent empty strings from wiping out stored credentials
  if (incoming.youtubeClientSecret === '') {
    merged.youtubeClientSecret = existing.youtubeClientSecret;
  }
  if (incoming.spotifyClientId === '') {
    merged.spotifyClientId = existing.spotifyClientId;
  }
  saveSettings(merged);
});

// Spotify IPC
ipcMain.handle('get-spotify-token', async () => {
  return spotify.getValidAccessToken();
});

ipcMain.handle('spotify-play-track', async (_event, uri: string, deviceId: string) => {
  const token = await spotify.getValidAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [uri] }),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Spotify play failed: ${res.status} ${text}`);
  }
});

ipcMain.handle('start-spotify-auth', async () => {
  await spotify.startAuth();
  const settings = loadSettings();
  saveSettings({ ...settings, spotifyConnected: true });
});

ipcMain.handle('spotify-logout', async () => {
  await spotify.logout();
  cache.removePlaylistsBySource('spotify');
  const settings = loadSettings();
  saveSettings({ ...settings, spotifyConnected: false });
});

ipcMain.handle('set-spotify-client-id', (_event, id: string) => {
  spotify.setClientId(id);
});

// YouTube IPC
ipcMain.handle('get-youtube-token', async () => {
  return youtube.getValidAccessToken();
});

ipcMain.handle('start-youtube-auth', async () => {
  await youtube.startAuth();
  const settings = loadSettings();
  saveSettings({ ...settings, youtubeConnected: true });
});

ipcMain.handle('youtube-logout', async () => {
  await youtube.logout();
  cache.removePlaylistsBySource('youtube');
  const settings = loadSettings();
  saveSettings({ ...settings, youtubeConnected: false });
});

ipcMain.handle('set-youtube-credentials', (_event, id: string, secret: string) => {
  youtube.setClientCredentials(id, secret);
});

// Library sync IPC
ipcMain.handle('sync-spotify-library', async () => {
  const [playlists, albums] = await Promise.all([
    spotifyApi.getMyPlaylists(),
    spotifyApi.getSavedAlbums(),
  ]);
  cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'spotify' })), 'spotify');
  cache.saveAlbums(albums.map((a) => ({ ...a, source: 'spotify' })), 'spotify');
  return { playlists, albums };
});

ipcMain.handle('sync-youtube-library', async () => {
  const playlists = await youtubeApi.getMyPlaylists();
  cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'youtube' })), 'youtube');
  return { playlists };
});

ipcMain.handle('get-playlist-tracks', async (_event, playlistId: string, source: string) => {
  const cached = cache.loadTracks().filter((t: any) => t.playlistId === playlistId);
  if (cached.length > 0) return cached;

  let tracks: any[] = [];
  if (source === 'spotify') {
    tracks = await spotifyApi.getPlaylistTracks(playlistId);
  } else if (source === 'youtube') {
    tracks = await youtubeApi.getPlaylistTracks(playlistId);
  }
  cache.saveTracks(tracks.map((t) => ({ ...t, playlistId })));
  return tracks;
});

ipcMain.handle('load-cached-library', () => {
  return {
    playlists: cache.loadPlaylists(),
    albums: cache.loadAlbums(),
    tracks: cache.loadTracks(),
  };
});

// Search IPC
ipcMain.handle('search-all', async (_event, query: string, musicOnly = false) => {
  const results: { tracks: any[]; albums: any[]; playlists: any[] } = {
    tracks: [],
    albums: [],
    playlists: [],
  };

  if (spotify.isAuthenticated()) {
    try {
      const spotifyResults = await spotifyApi.searchSpotify(query);
      results.tracks.push(...spotifyResults.tracks);
      results.albums.push(...spotifyResults.albums);
      results.playlists.push(...spotifyResults.playlists);
    } catch {
      // ignore
    }
  }

  if (youtube.isAuthenticated()) {
    try {
      const youtubeResults = await youtubeApi.searchYouTube(query, musicOnly);
      results.tracks.push(...youtubeResults.tracks);
      results.playlists.push(...youtubeResults.playlists);
    } catch {
      // ignore
    }
  }

  return results;
});

// Playlist management
ipcMain.handle('create-youtube-playlist', async (_event, name: string) => {
  return youtubeApi.createPlaylist(name);
});

ipcMain.handle('add-to-youtube-playlist', async (_event, playlistId: string, videoId: string) => {
  await youtubeApi.addVideoToPlaylist(playlistId, videoId);
});

ipcMain.handle('patch-playlist-image', (_event, playlistId: string, image: string) => {
  cache.patchPlaylistImage(playlistId, image);
});

ipcMain.handle('append-playlist', (_event, playlist: any) => {
  cache.appendPlaylist(playlist);
});

// External links
ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url);
});

// Cache management
ipcMain.handle('clear-cache', () => {
  cache.clearCache();
});

// App info
ipcMain.handle('get-app-version', () => app.getVersion());

// Update IPC
ipcMain.handle('get-update-status', () => updater.getStatus());
ipcMain.handle('check-for-updates', async () => {
  await updater.checkForUpdates();
});
ipcMain.handle('install-update', () => {
  mainWindow?.removeAllListeners('close');
  updater.quitAndInstall();
});

// Window controls
ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

ipcMain.handle('is-window-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});
