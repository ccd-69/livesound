import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater');
import { BrowserWindow } from 'electron';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloaded' | 'error';

let currentStatus: UpdateStatus = 'idle';
let currentVersion: string | null = null;
let currentError: string | null = null;
let mainWindow: BrowserWindow | null = null;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on('checking-for-update', () => {
  currentStatus = 'checking';
  currentVersion = null;
  currentError = null;
  sendStatus();
});

autoUpdater.on('update-available', (info) => {
  currentStatus = 'available';
  currentVersion = info.version;
  currentError = null;
  sendStatus();
});

autoUpdater.on('update-not-available', () => {
  currentStatus = 'not-available';
  currentVersion = null;
  currentError = null;
  sendStatus();
});

autoUpdater.on('update-downloaded', (info) => {
  currentStatus = 'downloaded';
  currentVersion = info.version;
  currentError = null;
  sendStatus();
});

autoUpdater.on('error', (err) => {
  currentStatus = 'error';
  currentError = err.message;
  sendStatus();
});

function sendStatus() {
  if (!mainWindow) return;
  mainWindow.webContents.send('update-status', {
    status: currentStatus,
    version: currentVersion,
    error: currentError,
  });
}

export function setWindow(win: BrowserWindow | null) {
  mainWindow = win;
}

export function getStatus() {
  return { status: currentStatus, version: currentVersion, error: currentError };
}

export function sendCurrentStatus() {
  sendStatus();
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}

export function downloadUpdate() {
  return autoUpdater.downloadUpdate();
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}
