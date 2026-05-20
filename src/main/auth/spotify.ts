import { BrowserWindow, safeStorage, app } from 'electron';
import https from 'https';
import crypto from 'crypto';
import forge from 'node-forge';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';

const REDIRECT_PORT = 8888;
const REDIRECT_URI = `https://localhost:${REDIRECT_PORT}/callback`;

let CLIENT_ID = '';

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let tokens: SpotifyTokens | null = null;
const TOKEN_PATH = path.join(app.getPath('userData'), 'spotify-tokens.enc');
let activeServer: https.Server | null = null;

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

function generateSelfSignedCert(): { key: string; cert: string } {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date(Date.now() - 86400000);
  cert.validity.notAfter = new Date(Date.now() + 86400000 * 365);

  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'Local' },
    { name: 'localityName', value: 'Local' },
    { name: 'organizationName', value: 'LiveSound' },
    { shortName: 'OU', value: 'Auth' },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
    },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
      ],
    },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert),
  };
}

function startRedirectServer(expectedState: string, verifier: string): Promise<SpotifyTokens> {
  return new Promise((resolve, reject) => {
    if (activeServer) {
      try { activeServer.close(); } catch { /* ignore */ }
      activeServer = null;
    }

    const { key, cert } = generateSelfSignedCert();

    const server = https.createServer({ key, cert }, (req, res) => {
      const url = new URL(req.url || '', `https://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h2>Auth failed</h2><p>${error}</p></body></html>`);
        server.close(() => reject(new Error(error)));
        return;
      }

      if (!code || state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h2>Auth failed</h2><p>Invalid state or missing code.</p></body></html>`);
        server.close(() => reject(new Error('Invalid state')));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body><h2>Spotify connected!</h2><p>You can close this window.</p></body></html>`);

      exchangeCode(code, verifier)
        .then((t) => {
          server.close(() => resolve(t));
        })
        .catch((err) => {
          server.close(() => reject(err));
        });
    });

    activeServer = server;

    server.listen(REDIRECT_PORT, () => {
      console.log(`[Spotify Auth] HTTPS redirect server listening on ${REDIRECT_URI}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Force-close any hanging server on this port and try once more
        try { server.close(); } catch { /* ignore */ }
        const net = require('net');
        const temp = net.createServer();
        temp.once('error', () => reject(err));
        temp.once('listening', () => {
          temp.close(() => reject(err));
        });
        temp.listen(REDIRECT_PORT);
        return;
      }
      reject(err);
    });
  });
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

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Connect Spotify',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Allow the self-signed certificate for localhost redirect
  win.webContents.on('certificate-error', (event, urlStr, _error, _certificate, callback) => {
    const parsed = new URL(urlStr);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });

  const serverPromise = startRedirectServer(state, verifier);
  win.loadURL(authUrl.toString());

  // Race against window being closed by user (cancelled)
  const cancelPromise = new Promise<never>((_, reject) => {
    const onClose = () => {
      if (activeServer) {
        try { activeServer.close(); } catch { /* ignore */ }
        activeServer = null;
      }
      reject(new Error('Auth cancelled by user'));
    };
    win.on('closed', onClose);
    // If the server resolves/rejects first, remove the listener so we don't leak
    serverPromise.finally(() => win.off('closed', onClose));
  });

  const result = await Promise.race([serverPromise, cancelPromise]);
  tokens = result;
  await persistTokens();
  win.close();
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
