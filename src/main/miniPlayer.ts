import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let miniPlayerWindow: BrowserWindow | null = null;
let devServerUrl: string | null = null;
let cachedState: any = null;

/**
 * Probe localhost ports to find the active Vite dev server.
 * Returns the first responsive URL or null if none found.
 */
async function findViteDevServer(): Promise<string | null> {
  const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
  for (const port of ports) {
    const url = `http://localhost:${port}/`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (response.ok || response.status === 404) {
        // Vite returns 404 for unknown paths but still responds
        return `http://localhost:${port}`;
      }
    } catch {
      // port not responding, try next
    }
  }
  return null;
}

/** Store the actual Vite dev server URL so the mini player loads from the same origin. */
export function setDevServerUrl(url: string) {
  devServerUrl = url.replace(/\/$/, '');
}

/** Cache the latest playback state so the mini player gets it immediately on open. */
export function cacheMiniPlayerState(state: any) {
  cachedState = state;
  // If mini player is already open, broadcast immediately
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.webContents.send('mini-player-state', state);
  }
}

export function isMiniPlayerOpen(): boolean {
  return miniPlayerWindow !== null && !miniPlayerWindow.isDestroyed();
}

export async function showMiniPlayer(): Promise<BrowserWindow> {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.show();
    miniPlayerWindow.focus();
    return miniPlayerWindow;
  }

  miniPlayerWindow = new BrowserWindow({
    width: 360,
    height: 240,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    roundedCorners: true,
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Position in bottom-right corner
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  miniPlayerWindow.setPosition(screenWidth - 380, screenHeight - 140);

  if (process.env.NODE_ENV === 'development') {
    // In dev, probe for the actual Vite server since the port may shift
    // due to stale processes from previous dev sessions.
    const baseUrl = devServerUrl || (await findViteDevServer()) || 'http://localhost:5173';
    const targetUrl = `${baseUrl.replace(/\/$/, '')}/#/mini-player`;
    console.log('[MiniPlayer] Loading from:', targetUrl);
    miniPlayerWindow.loadURL(targetUrl);
  } else {
    miniPlayerWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'), {
      hash: '/mini-player',
    });
  }

  // Debug: log any load errors
  miniPlayerWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[MiniPlayer] Failed to load:', errorCode, errorDescription);
  });

  miniPlayerWindow.webContents.on('did-finish-load', () => {
    console.log('[MiniPlayer] Loaded successfully');
    // Send cached state so the mini player shows current track immediately
    if (cachedState) {
      miniPlayerWindow?.webContents.send('mini-player-state', cachedState);
    }
  });

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
  });

  return miniPlayerWindow;
}

export function hideMiniPlayer(): void {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.hide();
  }
}

export function closeMiniPlayer(): void {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.close();
    miniPlayerWindow = null;
  }
}

export function sendToMiniPlayer(channel: string, ...args: any[]): void {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.webContents.send(channel, ...args);
  }
}
