import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater');
import { BrowserWindow } from 'electron';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

let currentStatus: UpdateStatus = 'idle';
let currentVersion: string | null = null;
let currentError: string | null = null;
let currentProgress = 0;
let mainWindow: BrowserWindow | null = null;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on('checking-for-update', () => {
  currentStatus = 'checking';
  currentVersion = null;
  currentError = null;
  currentProgress = 0;
  sendStatus();
});

autoUpdater.on('update-available', (info) => {
  currentStatus = 'available';
  currentVersion = info.version;
  currentError = null;
  currentProgress = 0;
  console.log('[Updater] Update available:', info.version);
  sendStatus();
});

autoUpdater.on('update-not-available', () => {
  currentStatus = 'not-available';
  currentVersion = null;
  currentError = null;
  currentProgress = 0;
  sendStatus();
});

autoUpdater.on('download-progress', (progress) => {
  currentStatus = 'downloading';
  currentProgress = progress.percent || 0;
  console.log('[Updater] Download progress:', currentProgress.toFixed(1) + '%');
  sendStatus();
});

autoUpdater.on('update-downloaded', (info) => {
  currentStatus = 'downloaded';
  currentVersion = info.version;
  currentError = null;
  currentProgress = 100;
  console.log('[Updater] Update downloaded:', info.version);
  sendStatus();
});

autoUpdater.on('error', (err) => {
  currentStatus = 'error';
  currentError = err.message;
  console.error('[Updater] Error:', err.message);
  sendStatus();
});

function sendStatus() {
  if (!mainWindow) return;
  mainWindow.webContents.send('update-status', {
    status: currentStatus,
    version: currentVersion,
    error: currentError,
    progress: currentProgress,
  });
}

export function setWindow(win: BrowserWindow | null) {
  mainWindow = win;
}

export function getStatus() {
  return { status: currentStatus, version: currentVersion, error: currentError, progress: currentProgress };
}

export function sendCurrentStatus() {
  sendStatus();
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}

export async function downloadUpdate() {
  console.log('[Updater] Starting download...');
  try {
    await autoUpdater.downloadUpdate();
    console.log('[Updater] Download completed');
  } catch (err: any) {
    console.error('[Updater] Download failed:', err.message);
    currentStatus = 'error';
    currentError = err.message;
    sendStatus();
    throw err;
  }
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}
