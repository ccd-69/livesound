import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, shell, WebContentsView, session, powerMonitor, protocol, desktopCapturer } from 'electron';
import http from 'http';
import fs from 'fs';
import os from 'os';
import {
  cleanupTempFiles,
  clearCacheOnUpdate,
  createStartupTimer,
  managePowerState,
  auditProcesses,
} from '@yawlabs/electron-optimize';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadSettings, saveSettings } from './store/settings.js';
import * as spotify from './auth/spotify.js';
import * as youtube from './auth/youtube.js';
import * as soundcloud from './auth/soundcloud.js';
import * as spotifyApi from './api/spotify.js';
import * as youtubeApi from './api/youtube.js';
import * as soundcloudApi from './api/soundcloud.js';
import * as soundcloudFree from './api/soundcloudFree.js';
import * as cache from './db/cache.js';
import * as updater from './updater.js';
import * as discordRpc from './discord/rpc.js';
import * as miniPlayer from './miniPlayer.js';

// Dynamic import for youtube-dl-exec (ESM)
let youtubedl: any = null;
async function getYoutubeDl() {
  if (!youtubedl) {
    const mod = await import('youtube-dl-exec');
    youtubedl = mod.default || mod;
  }
  return youtubedl;
}

// Extract session cookies for yt-dlp so age-restricted content can play
// using the Google account cookies from the in-app OAuth flow.
async function writeSessionCookiesToFile(): Promise<string | null> {
  try {
    const allCookies = await session.defaultSession.cookies.get({});
    const relevant = allCookies.filter((c: any) => {
      const d = c.domain || '';
      return d.includes('youtube.com') || d.includes('google.com');
    });
    if (relevant.length === 0) return null;

    const lines = [
      '# Netscape HTTP Cookie File',
      '# https://curl.se/rfc/cookie_spec.html',
      '# This is a generated file! Do not edit.',
      '',
    ];
    for (const c of relevant) {
      const domain = c.domain || '';
      const subdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expiry = c.expirationDate ? Math.floor(c.expirationDate).toString() : '0';
      lines.push(`${domain}\t${subdomains}\t${c.path || '/'}\t${secure}\t${expiry}\t${c.name}\t${c.value}`);
    }

    const tmpFile = path.join(os.tmpdir(), `livesound_cookies_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, lines.join('\n'));
    return tmpFile;
  } catch {
    return null;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let ytmView: WebContentsView | null = null;

function destroyYtmView() {
  if (ytmView) {
    try {
      mainWindow?.contentView.removeChildView(ytmView);
      (ytmView.webContents as any).destroy?.();
    } catch {}
    ytmView = null;
  }
}

function destroyTray() {
  if (tray) {
    try {
      tray.destroy();
    } catch {}
    tray = null;
  }
}


let staticServerPort = 0;

function startStaticServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const rendererDir = path.join(import.meta.dirname, '../renderer');
    const server = http.createServer((req, res) => {
      const reqPath = req.url?.split('?')[0] || '/';
      let filePath = path.join(rendererDir, reqPath === '/' ? 'index.html' : reqPath);

      // Prevent directory traversal
      if (!filePath.startsWith(rendererDir)) {
        res.writeHead(403);
        res.end();
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback: serve index.html for any non-file path
          fs.readFile(path.join(rendererDir, 'index.html'), (err2, data2) => {
            if (err2) {
              res.writeHead(404);
              res.end();
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data2);
          });
          return;
        }

        const ext = path.extname(filePath);
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(0, 'localhost', () => {
      const addr = server.address();
      const port = typeof addr === 'string' ? 0 : addr?.port ?? 0;
      staticServerPort = port;
      console.log(`[StaticServer] Serving renderer at http://localhost:${port}`);
      resolve(port);
    });

    server.on('error', reject);
  });
}

async function createWindow() {
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
      webviewTag: true,
      webSecurity: false,
    },
  });

  updater.setWindow(mainWindow);
  updater.sendCurrentStatus();

  if (isDev) {
    const devUrl = 'http://localhost:5173';
    mainWindow.loadURL(`${devUrl}/`).catch(() => {});
    miniPlayer.setDevServerUrl(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadURL(`http://localhost:${staticServerPort}`);
  }

  // Security: block new-window / auxclick navigation to untrusted origins
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = ['http://localhost:', 'https://localhost:'];
    if (!allowed.some((prefix) => url.startsWith(prefix))) {
      event.preventDefault();
    }
  });

  // Security: restrict permission requests from renderer.
  // Allow fullscreen and media (required for the audio visualizer via getDisplayMedia).
  // display-capture may be requested on some platforms before getDisplayMedia proceeds.
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'fullscreen' || permission === 'media' || permission === 'display-capture');
  });

  mainWindow.on('closed', () => {
    destroyYtmView();
        mainWindow = null;
  });

  // Resize YouTube Music view when window resizes
  mainWindow.on('resize', () => {
    if (!mainWindow || !ytmView) return;
    const bounds = mainWindow.getContentBounds();
    ytmView.setBounds({
      x: 240,
      y: 32,
      width: bounds.width - 240,
      height: bounds.height - 32 - 80,
    });
  });

  // Fully close app when window is closed (do not minimize to tray)
  mainWindow.on('close', () => {
    destroyYtmView();
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
        destroyYtmView();
        destroyTray();
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

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

const timer = createStartupTimer();

app.whenReady().then(async () => {
  timer.mark('app-ready');

  // Clean up stale Chromium temp files
  const removed = cleanupTempFiles(app.getPath('userData'));
  if (removed > 0) console.log(`[Optimize] Cleaned ${removed} temp files`);

  // Clear caches if the app was updated since last run
  const cacheResult = await clearCacheOnUpdate(
    app.getPath('userData'),
    app.getVersion(),
    session.defaultSession as any,
  );
  if (cacheResult.versionChanged) {
    console.log(`[Optimize] Updated ${cacheResult.previousVersion} -> ${cacheResult.currentVersion}, caches cleared`);
  }

  // Set up display media request handler for audio visualizer.
  // Uses a screen source with audio loopback so the renderer can capture
  // system audio via getDisplayMedia (avoids the legacy getUserMedia crash on Windows 11).
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } }).then((sources) => {
      if (sources.length > 0) {
        callback({ video: sources[0], audio: 'loopback' });
      } else {
        callback({});
      }
    });
  }, { useSystemPicker: false });

  // Restore saved credentials into auth modules on startup
  const startupSettings = loadSettings();
  if (startupSettings.spotifyClientId) {
    spotify.setClientId(startupSettings.spotifyClientId);
  }
  if (startupSettings.youtubeClientId && startupSettings.youtubeClientSecret) {
    youtube.setClientCredentials(startupSettings.youtubeClientId, startupSettings.youtubeClientSecret);
  }
  if (startupSettings.soundcloudClientId && startupSettings.soundcloudClientSecret) {
    soundcloud.setClientCredentials(startupSettings.soundcloudClientId, startupSettings.soundcloudClientSecret);
  }

  // Start a local HTTP server to serve renderer files in production.
  // A real http://localhost origin gives the YouTube iframe a valid Referer
  // header, which is required to avoid Error 153.
  if (!isDev) {
    await startStaticServer();
  }

  await createWindow();
  timer.mark('window-created');
  createTray();

  if (mainWindow) {
    mainWindow.once('ready-to-show', () => {
      timer.mark('ready-to-show');
      timer.flush();
    });
  }

  // Log process audit once, 10s after startup
  setTimeout(() => {
    const audit = auditProcesses(app);
    console.log(`[Optimize] Total memory: ${audit.totalMemoryFormatted} across ${audit.processes.length} processes`);
  }, 10000);

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
    if (soundcloud.isAuthenticated()) {
      try {
        const [playlists, tracks] = await Promise.all([
          soundcloudApi.getMyPlaylists(),
          soundcloudApi.getLikedTracks(),
        ]);
        cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'soundcloud' })), 'soundcloud');
        cache.saveTracks(tracks.map((t) => ({ ...t, source: 'soundcloud' })), 'soundcloud');
      } catch {
        // ignore
      }
    }
  })();

  // Connect to Discord RPC if configured
  discordRpc.connect().catch(() => {});

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
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  function startPolling() {
    if (pollingTimer) return;
    pollingTimer = setInterval(async () => {
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
      if (soundcloud.isAuthenticated()) {
        try {
          const [playlists, tracks] = await Promise.all([
            soundcloudApi.getMyPlaylists(),
            soundcloudApi.getLikedTracks(),
          ]);
          cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'soundcloud' })), 'soundcloud');
          cache.saveTracks(tracks.map((t) => ({ ...t, source: 'soundcloud' })), 'soundcloud');
        } catch {
          // ignore
        }
      }
    }, 300000);
  }
  startPolling();

  // Pause polling during sleep/resume to avoid CPU spikes and failed requests
  const cleanupPower = managePowerState(powerMonitor, {
    onSuspend() {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
    },
    onResume() {
      startPolling();
    },
  });
  app.on('before-quit', cleanupPower);
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  destroyYtmView();
    if (isDev || process.platform !== 'darwin') {
    // In dev mode, quit immediately so leftover processes don't accumulate
    // On Windows/Linux quit when all windows are closed
    destroyTray();
    app.quit();
  }
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  destroyYtmView();
    destroyTray();
});

// Settings IPC
ipcMain.handle('get-settings', () => {
  const settings = loadSettings();
  // Override stale booleans if token files are actually missing
  // Never send secrets to the renderer
  const { youtubeClientSecret: _y, soundcloudClientSecret: _s, ...safeSettings } = settings;
  return {
    ...safeSettings,
    spotifyConnected: settings.spotifyConnected && spotify.hasTokens(),
    youtubeConnected: settings.youtubeConnected && youtube.hasTokens(),
    soundcloudConnected: settings.soundcloudConnected && soundcloud.hasTokens(),
  };
});
ipcMain.handle('save-settings', (_event, incoming) => {
  const existing = loadSettings();
  const merged = { ...existing, ...incoming };
  // Prevent empty strings from wiping out stored credentials
  if (incoming.youtubeClientSecret === '') {
    merged.youtubeClientSecret = existing.youtubeClientSecret;
  }
  if (incoming.soundcloudClientSecret === '') {
    merged.soundcloudClientSecret = existing.soundcloudClientSecret;
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

// SoundCloud IPC
ipcMain.handle('start-soundcloud-auth', async () => {
  await soundcloud.startAuth();
  const settings = loadSettings();
  saveSettings({ ...settings, soundcloudConnected: true });
});

ipcMain.handle('soundcloud-logout', async () => {
  await soundcloud.logout();
  cache.removePlaylistsBySource('soundcloud');
  const settings = loadSettings();
  saveSettings({ ...settings, soundcloudConnected: false });
});

ipcMain.handle('set-soundcloud-credentials', (_event, id: string, secret: string) => {
  soundcloud.setClientCredentials(id, secret);
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

ipcMain.handle('sync-soundcloud-library', async () => {
  const [playlists, tracks] = await Promise.all([
    soundcloudApi.getMyPlaylists(),
    soundcloudApi.getLikedTracks(),
  ]);
  cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'soundcloud' })), 'soundcloud');
  cache.saveTracks(tracks.map((t) => ({ ...t, source: 'soundcloud' })), 'soundcloud');
  return { playlists, tracks };
});

ipcMain.handle('sync-soundcloud-free', async (_event, profileUrl: string) => {
  const [playlists, tracks] = await Promise.all([
    soundcloudFree.getUserPlaylists(profileUrl),
    soundcloudFree.getUserLikes(profileUrl),
  ]);
  cache.savePlaylists(playlists.map((p) => ({ ...p, source: 'soundcloud' })), 'soundcloud');
  cache.saveTracks(tracks.map((t) => ({ ...t, source: 'soundcloud' })), 'soundcloud');
  return { playlists, tracks };
});

ipcMain.handle('soundcloud-free-search', async (_event, query: string) => {
  return soundcloudFree.searchSoundCloudFree(query, 50);
});

ipcMain.handle('get-playlist-tracks', async (_event, playlistId: string, source?: string) => {
  const cached = cache.loadTracks().filter((t: any) => t.playlistId === playlistId);
  if (cached.length > 0) return cached;

  let tracks: any[] = [];
  const src = source || 'spotify';

  if (src === 'spotify') {
    tracks = await spotifyApi.getPlaylistTracks(playlistId);
  } else if (src === 'youtube') {
    tracks = await youtubeApi.getPlaylistTracks(playlistId);
  } else if (src === 'soundcloud') {
    tracks = await soundcloudApi.getPlaylistTracks(playlistId).catch(() => []);
    if (!tracks.length) {
      tracks = await soundcloudFree.getPlaylistTracksFree(playlistId);
    }
  }
  cache.saveTracks(tracks, playlistId);
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
ipcMain.handle('search-all', async (_event, query: string, musicOnly = false, platforms?: any) => {
  const opts = platforms || { spotify: true, youtube: true, soundcloud: true };
  const results: { tracks: any[]; albums: any[]; playlists: any[] } = {
    tracks: [],
    albums: [],
    playlists: [],
  };

  const spotifyAuth = spotify.isAuthenticated();
  const youtubeAuth = youtube.isAuthenticated();
  const scAuth = soundcloud.isAuthenticated();
  console.log('[SearchAll] Platform auth state — Spotify:', spotifyAuth, 'YouTube:', youtubeAuth, 'SoundCloud:', scAuth);
  console.log('[SearchAll] Platform filters:', opts);

  if (opts.spotify !== false && spotifyAuth) {
    try {
      const spotifyResults = await spotifyApi.searchSpotify(query);
      console.log('[SearchAll] Spotify results:', spotifyResults.tracks.length, 'tracks,', spotifyResults.albums.length, 'albums,', spotifyResults.playlists.length, 'playlists');
      results.tracks.push(...spotifyResults.tracks);
      results.albums.push(...spotifyResults.albums);
      results.playlists.push(...spotifyResults.playlists);
    } catch (err: any) {
      console.error('[SearchAll] Spotify search error:', err.message);
    }
  }

  if (opts.youtube !== false && youtubeAuth) {
    try {
      const youtubeResults = await youtubeApi.searchYouTube(query, musicOnly);
      console.log('[SearchAll] YouTube results:', youtubeResults.tracks.length, 'tracks,', youtubeResults.playlists.length, 'playlists');
      results.tracks.push(...youtubeResults.tracks);
      results.playlists.push(...youtubeResults.playlists);
    } catch (err: any) {
      console.error('[SearchAll] YouTube search error:', err.message);
    }
  }

  if (opts.soundcloud !== false && scAuth) {
    try {
      const scResults = await soundcloudApi.searchSoundCloud(query);
      console.log('[SearchAll] SoundCloud official results:', scResults.tracks.length, 'tracks,', scResults.playlists.length, 'playlists');
      results.tracks.push(...scResults.tracks);
      results.playlists.push(...scResults.playlists);
    } catch (err: any) {
      console.error('[SearchAll] SoundCloud official search error:', err.message);
    }
  }

  // Always search SoundCloud via free API regardless of auth state
  if (opts.soundcloud !== false) {
    try {
      const scFree = await soundcloudFree.searchSoundCloudFree(query, 50);
      console.log('[SearchAll] SoundCloud free results:', scFree.tracks.length, 'tracks,', scFree.playlists.length, 'playlists');
      results.tracks.push(...scFree.tracks);
      results.playlists.push(...scFree.playlists);
    } catch (err: any) {
      console.error('[SearchAll] SoundCloud free search error:', err.message);
    }
  }

  console.log('[SearchAll] Total results:', results.tracks.length, 'tracks,', results.albums.length, 'albums,', results.playlists.length, 'playlists');
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

// Local unified playlist CRUD
ipcMain.handle('create-local-playlist', (_event, name: string, description?: string) => {
  return cache.createLocalPlaylist(name, description || '');
});

ipcMain.handle('update-local-playlist', (_event, playlistId: string, updates: any) => {
  return cache.updateLocalPlaylist(playlistId, updates);
});

ipcMain.handle('delete-local-playlist', (_event, playlistId: string) => {
  return cache.deleteLocalPlaylist(playlistId);
});

ipcMain.handle('load-local-playlists', () => {
  return cache.loadLocalPlaylists();
});

ipcMain.handle('add-track-to-local-playlist', (_event, playlistId: string, track: any) => {
  return cache.addTrackToLocalPlaylist(playlistId, track);
});

ipcMain.handle('remove-track-from-local-playlist', (_event, playlistId: string, trackId: string) => {
  return cache.removeTrackFromLocalPlaylist(playlistId, trackId);
});

// External links — only allow http/https to prevent arbitrary execution
ipcMain.handle('open-external', (_event, url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      shell.openExternal(url);
    }
  } catch {
    // invalid URL
  }
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
ipcMain.handle('download-update', async () => {
  await updater.downloadUpdate();
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
  if (isDev) {
    // In dev mode, fully quit so we don't accumulate ghost processes
    destroyYtmView();
    destroyTray();
    app.quit();
  } else {
    mainWindow?.close();
  }
});

ipcMain.handle('is-window-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// YouTube Playback IPC
ipcMain.handle('youtube-get-stream-url', async (_event, videoUrl: string) => {
  let cookiesFile: string | null = null;
  try {
    const ydl = await getYoutubeDl();
    cookiesFile = await writeSessionCookiesToFile();

    const options: any = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
    };
    if (cookiesFile) {
      options.cookies = cookiesFile;
    }

    const result = await ydl(videoUrl, options);

    // Prefer audio-only formats, fallback to any format with audio
    const audioFormat = result.formats?.find(
      (f: any) => f.vcodec === 'none' && f.acodec !== 'none'
    ) || result.formats?.find((f: any) => f.acodec !== 'none') || result.formats?.[0];

    return {
      success: true,
      url: audioFormat?.url || result.url,
      title: result.title,
      thumbnail: result.thumbnail,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    if (cookiesFile) {
      try { fs.unlinkSync(cookiesFile); } catch { /* ignore */ }
    }
  }
});

ipcMain.handle('youtube-video-details', async (_event, videoId: string) => {
  try {
    const details = await youtubeApi.getVideoDetails(videoId);
    return { success: true, details };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('youtube-video-comments', async (_event, videoId: string) => {
  try {
    const comments = await youtubeApi.getVideoComments(videoId);
    return { success: true, comments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('youtube-post-comment', async (_event, videoId: string, text: string) => {
  try {
    await youtubeApi.postVideoComment(videoId, text);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('soundcloud-get-stream-url', async (_event, trackId: string) => {
  try {
    const official = await soundcloudApi.getStreamUrl(trackId);
    if (official.success) return official;
    return await soundcloudFree.getStreamUrlFree(trackId);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('youtube-create-view', (_event, videoId: string) => {
  if (!mainWindow) return { success: false, error: 'No window' };

  // Destroy existing view if any
  if (ytmView) {
    mainWindow.contentView.removeChildView(ytmView);
    (ytmView.webContents as any).destroy?.();
    ytmView = null;
  }

  ytmView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Attach to window FIRST (critical fix from ytmdesktop PR #1661)
  mainWindow.contentView.addChildView(ytmView);

  // Position over the content area (right of sidebar, below title bar, above player bar)
  const bounds = mainWindow.getContentBounds();
  ytmView.setBounds({
    x: 240,
    y: 32,
    width: bounds.width - 240,
    height: bounds.height - 32 - 80, // title bar + player bar
  });

  // Then load URL
  ytmView.webContents.loadURL(`https://music.youtube.com/watch?v=${videoId}`);

  return { success: true };
});

ipcMain.handle('youtube-destroy-view', () => {
  if (!mainWindow || !ytmView) return;
  mainWindow.contentView.removeChildView(ytmView);
  (ytmView.webContents as any).destroy?.();
  ytmView = null;
});

ipcMain.handle('youtube-play-view', () => {
  if (!ytmView) return;
  ytmView.webContents.executeJavaScript(`
    const video = document.querySelector('video');
    if (video) video.play();
  `).catch(() => {});
});

ipcMain.handle('youtube-pause-view', () => {
  if (!ytmView) return;
  ytmView.webContents.executeJavaScript(`
    const video = document.querySelector('video');
    if (video) video.pause();
  `).catch(() => {});
});

ipcMain.handle('youtube-show-view', (_event, show: boolean) => {
  if (!mainWindow || !ytmView) return;
  const bounds = mainWindow.getContentBounds();
  if (show) {
    ytmView.setBounds({
      x: 240,
      y: 32,
      width: bounds.width - 240,
      height: bounds.height - 32 - 80,
    });
  } else {
    ytmView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
});

ipcMain.handle('send-mini-player-state', (_event, state: any) => {
  miniPlayer.cacheMiniPlayerState(state);
});

// Discord Rich Presence IPC
ipcMain.handle('discord-set-activity', async (_event, activity: any) => {
  await discordRpc.setActivity(activity);
});

ipcMain.handle('discord-clear-activity', async () => {
  await discordRpc.clearActivity();
});

ipcMain.handle('discord-connect', async () => {
  await discordRpc.connect();
});

ipcMain.handle('discord-disconnect', () => {
  discordRpc.disconnect();
});

// Mini Player IPC
ipcMain.handle('mini-player-show', async () => {
  await miniPlayer.showMiniPlayer();
});

ipcMain.handle('mini-player-hide', () => {
  miniPlayer.hideMiniPlayer();
});

ipcMain.handle('mini-player-close', () => {
  miniPlayer.closeMiniPlayer();
});

ipcMain.handle('mini-player-is-open', () => {
  return miniPlayer.isMiniPlayerOpen();
});

// Forward mini player media controls to main window
ipcMain.handle('media-play-pause-from-mini', () => {
  mainWindow?.webContents.send('media-play-pause');
});

ipcMain.handle('media-next-from-mini', () => {
  mainWindow?.webContents.send('media-next');
});

ipcMain.handle('media-previous-from-mini', () => {
  mainWindow?.webContents.send('media-previous');
});

// Listening History IPC
ipcMain.handle('append-history-event', (_event, event: any) => {
  cache.appendHistoryEvent(event);
});

ipcMain.handle('finalize-history-event', (_event, trackId: string, endedAt: number) => {
  cache.finalizeHistoryEvent(trackId, endedAt);
});

ipcMain.handle('load-history', () => {
  return cache.loadHistory();
});

ipcMain.handle('clear-history', () => {
  cache.clearHistory();
});

// Related Tracks / Autoplay IPC
ipcMain.handle('youtube-get-related', async (_event, videoId: string, maxResults?: number) => {
  return youtubeApi.getRelatedVideos(videoId, maxResults);
});

ipcMain.handle('spotify-get-recommendations', async (_event, seedTrackId: string, limit?: number) => {
  return spotifyApi.getRecommendations(seedTrackId, limit);
});

