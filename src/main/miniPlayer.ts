import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let miniPlayerWindow: BrowserWindow | null = null;
let devServerUrl: string | null = null;

/** Store the actual Vite dev server URL so the mini player loads from the same origin. */
export function setDevServerUrl(url: string) {
  devServerUrl = url.replace(/\/$/, '');
}

export function isMiniPlayerOpen(): boolean {
  return miniPlayerWindow !== null && !miniPlayerWindow.isDestroyed();
}

export function showMiniPlayer(): BrowserWindow {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.show();
    miniPlayerWindow.focus();
    return miniPlayerWindow;
  }

  miniPlayerWindow = new BrowserWindow({
    width: 360,
    height: 120,
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
    const baseUrl = devServerUrl || 'http://localhost:5173';
    miniPlayerWindow.loadURL(`${baseUrl}/#/mini-player`);
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
