import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let miniPlayerWindow: BrowserWindow | null = null;

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
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Position in bottom-right corner
  const primaryDisplay = require('electron').screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  miniPlayerWindow.setPosition(screenWidth - 380, screenHeight - 140);

  if (process.env.NODE_ENV === 'development') {
    miniPlayerWindow.loadURL('http://localhost:5173/mini-player');
  } else {
    miniPlayerWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'), {
      hash: '/mini-player',
    });
  }

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
