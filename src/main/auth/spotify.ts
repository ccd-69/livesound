import { BrowserWindow, safeStorage, app } from 'electron';
import crypto from 'crypto';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';

const REDIRECT_URI = 'https://localhost:8888/callback';

let CLIENT_ID = '';

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let tokens: SpotifyTokens | null = null;
const TOKEN_PATH = path.join(app.getPath('userData'), 'spotify-tokens.enc');

function loadClientId(): string {
  if (CLIENT_ID) return CLIENT_ID;
  CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
  return CLIENT_ID;
}

export function setClientId(id: string) {
  CLIENT_ID = id;
}

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function sha256(plain: string): Buffer {
  return crypto.createHash('sha256').update(plain).digest();
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = base64URLEncode(crypto.randomBytes(32));
  const challenge = base64URLEncode(sha256(verifier));
  return { verifier, challenge };
}

async function exchangeCode(code: string, verifier: string): Promise<SpotifyTokens> {
  const clientId = loadClientId();
  if (!clientId) throw new Error('Spotify Client ID is not set');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: verifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await persistTokens();
  return tokens;
}

async function refreshAccessToken(): Promise<string> {
  if (!tokens?.refreshToken) throw new Error('No refresh token available');
  const clientId = loadClientId();
  if (!clientId) throw new Error('Spotify Client ID is not set');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: clientId,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await persistTokens();
  return tokens.accessToken;
}

export async function getValidAccessToken(): Promise<string> {
  if (!tokens) {
    if (!loadTokens()) throw new Error('Not authenticated with Spotify');
  }
  if (Date.now() >= tokens!.expiresAt - 60000) {
    return refreshAccessToken();
  }
  return tokens!.accessToken;
}

export async function startAuth(): Promise<void> {
  const clientId = loadClientId();
  if (!clientId) {
    throw new Error('Spotify Client ID is not set. Please set it in Settings.');
  }

  const { verifier, challenge } = generatePKCE();
  const state = base64URLEncode(crypto.randomBytes(16));

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('scope', 'streaming user-read-email user-read-private user-library-read user-library-modify playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state');

  return new Promise<void>((resolve, reject) => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'Connect Spotify',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    let completed = false;

    function finish(err?: Error, t?: SpotifyTokens) {
      if (completed) return;
      completed = true;
      win.destroy();
      if (err) reject(err);
      else if (t) {
        tokens = t;
        persistTokens().then(() => resolve()).catch(reject);
      }
    }

    // Intercept the OAuth redirect before the browser tries to load it.
    // Spotify sends a 302 to the redirect URI; we grab the code from the URL and close the window.
    win.webContents.on('will-redirect', (event, url) => {
      const parsed = new URL(url);
      if (parsed.origin + parsed.pathname !== REDIRECT_URI) return;

      event.preventDefault();

      const code = parsed.searchParams.get('code');
      const returnedState = parsed.searchParams.get('state');
      const error = parsed.searchParams.get('error');

      if (error) {
        finish(new Error(error));
        return;
      }
      if (!code || returnedState !== state) {
        finish(new Error('Invalid state or missing code'));
        return;
      }

      exchangeCode(code, verifier)
        .then((t) => finish(undefined, t))
        .catch((err) => finish(err));
    });

    win.on('closed', () => {
      if (!completed) finish(new Error('Auth cancelled by user'));
    });

    win.loadURL(authUrl.toString()).catch((err) => finish(err));
  });
}

export async function logout(): Promise<void> {
  tokens = null;
  try {
    if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  if (!tokens) {
    if (!loadTokens()) return false;
  }
  return !!tokens && Date.now() < tokens.expiresAt;
}

export function hasTokens(): boolean {
  try {
    return fs.existsSync(TOKEN_PATH);
  } catch {
    return false;
  }
}

async function persistTokens() {
  if (!tokens) return;
  try {
    const buffer = safeStorage.encryptString(JSON.stringify(tokens));
    fs.writeFileSync(TOKEN_PATH, buffer);
  } catch {
    // safeStorage may not be available on all platforms
  }
}

function loadTokens(): boolean {
  try {
    if (!fs.existsSync(TOKEN_PATH)) return false;
    const buffer = fs.readFileSync(TOKEN_PATH);
    const decrypted = safeStorage.decryptString(buffer);
    tokens = JSON.parse(decrypted);
    return true;
  } catch {
    return false;
  }
}
