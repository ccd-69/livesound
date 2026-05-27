import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const CACHE_DIR = path.join(app.getPath('userData'), 'livesound');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function readJson<T>(name: string): T {
  ensureDir();
  const file = path.join(CACHE_DIR, `${name}.json`);
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return [] as unknown as T;
}

function writeJson(name: string, data: any) {
  ensureDir();
  const file = path.join(CACHE_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Settings (still kept in config.json via store/settings.ts, but cache.ts can be used for other things)

export function savePlaylists(playlists: any[], source: string) {
  const existing = readJson<any[]>('playlists');
  const existingMap = new Map(existing.map((p) => [p.id, p]));
  for (const p of playlists) {
    const old = existingMap.get(p.id);
    const merged: any = { ...p };
    if (!p.image && old?.image) {
      merged.image = old.image;
    }
    // Always preserve createdAt from cache if it exists; API may not provide real creation dates
    if (old?.createdAt) {
      merged.createdAt = old.createdAt;
    }
    // For brand-new playlists without any createdAt, assign current time
    if (!merged.createdAt) {
      merged.createdAt = Date.now();
    }
    delete merged._createdAt;
    existingMap.set(p.id, merged);
  }
  writeJson('playlists', Array.from(existingMap.values()));
  writeJson('cache_meta_playlists', { updatedAt: Date.now() });
}

export function removePlaylistsBySource(source: string) {
  const existing = readJson<any[]>('playlists');
  const filtered = existing.filter((p) => p.source !== source);
  writeJson('playlists', filtered);
}

export function loadPlaylists(): any[] {
  return readJson<any[]>('playlists');
}

export function patchPlaylistImage(playlistId: string, image: string) {
  const existing = readJson<any[]>('playlists');
  const patched = existing.map((p) => (p.id === playlistId ? { ...p, image } : p));
  writeJson('playlists', patched);
}

export function appendPlaylist(playlist: any) {
  const existing = readJson<any[]>('playlists');
  const map = new Map(existing.map((p) => [p.id, p]));
  map.set(playlist.id, { ...playlist, createdAt: Date.now(), _createdAt: Date.now() });
  writeJson('playlists', Array.from(map.values()));
}

export function saveTracks(tracks: any[], playlistId?: string) {
  const existing = readJson<any[]>('tracks');
  const map = new Map(existing.map((t) => [t.id, t]));
  for (const t of tracks) {
    const merged = { ...t };
    if (playlistId) {
      merged.playlistId = playlistId;
    }
    map.set(t.id, merged);
  }
  writeJson('tracks', Array.from(map.values()));
}

export function loadTracks(): any[] {
  return readJson<any[]>('tracks');
}

export function saveAlbums(albums: any[], source: string) {
  const existing = readJson<any[]>('albums');
  const kept = existing.filter((a) => a.source !== source);
  const map = new Map(kept.map((a) => [a.id, a]));
  for (const a of albums) map.set(a.id, a);
  writeJson('albums', Array.from(map.values()));
  writeJson('cache_meta_albums', { updatedAt: Date.now() });
}

export function loadAlbums(): any[] {
  return readJson<any[]>('albums');
}

export function isCacheStale(key: string, maxAgeMs: number): boolean {
  const meta = readJson<{ updatedAt?: number }>(`cache_meta_${key}`);
  if (!meta?.updatedAt) return true;
  return Date.now() - meta.updatedAt > maxAgeMs;
}

export function clearCache() {
  ensureDir();
  const files = ['playlists.json', 'tracks.json', 'albums.json', 'cache_meta_playlists.json', 'cache_meta_albums.json'];
  for (const f of files) {
    const p = path.join(CACHE_DIR, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

/* ------------------------------------------------------------------ */
/* Listening History                                                  */
/* ------------------------------------------------------------------ */

const MAX_HISTORY = 5000;

export interface HistoryEvent {
  id: string;
  trackId: string;
  name: string;
  artist: string;
  album?: string;
  image?: string;
  source: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
}

export function appendHistoryEvent(event: HistoryEvent) {
  const existing = readJson<HistoryEvent[]>('history');
  existing.push(event);
  if (existing.length > MAX_HISTORY) {
    existing.splice(0, existing.length - MAX_HISTORY);
  }
  writeJson('history', existing);
}

export function finalizeHistoryEvent(trackId: string, endedAt: number) {
  const existing = readJson<HistoryEvent[]>('history');
  for (let i = existing.length - 1; i >= 0; i--) {
    const e = existing[i];
    if (e.trackId === trackId && !e.endedAt) {
      e.endedAt = endedAt;
      e.durationMs = endedAt - e.startedAt;
      writeJson('history', existing);
      return;
    }
  }
}

export function loadHistory(): HistoryEvent[] {
  return readJson<HistoryEvent[]>('history');
}

export function clearHistory() {
  writeJson('history', []);
}
