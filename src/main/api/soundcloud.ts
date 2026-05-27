import * as soundcloudAuth from '../auth/soundcloud.js';

const API_BASE = 'https://api.soundcloud.com';

async function apiFetch(path: string, params?: Record<string, string>) {
  const token = await soundcloudAuth.getValidAccessToken();
  const url = new URL(API_BASE + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (!res.ok) throw new Error(`SoundCloud API error: ${res.status}`);
  return res.json();
}

function normalizeTrack(t: any) {
  return {
    id: String(t.id),
    name: t.title || 'Untitled',
    artist: t.user?.username || 'SoundCloud',
    album: '',
    durationMs: t.duration || 0,
    image: t.artwork_url ? t.artwork_url.replace('-large', '-t500x500') : t.user?.avatar_url?.replace('-large', '-t500x500') || '',
    source: 'soundcloud',
    uri: t.permalink_url || `https://soundcloud.com/tracks/${t.id}`,
    streamable: t.streamable !== false,
  };
}

function normalizePlaylist(p: any) {
  return {
    id: String(p.id),
    name: p.title || 'Untitled',
    owner: p.user?.username || 'SoundCloud',
    image: p.artwork_url ? p.artwork_url.replace('-large', '-t500x500') : p.user?.avatar_url?.replace('-large', '-t500x500') || '',
    source: 'soundcloud',
    trackCount: p.track_count || 0,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
  };
}

export async function searchSoundCloud(q: string): Promise<{ tracks: any[]; playlists: any[] }> {
  const [tracksData, playlistsData] = await Promise.all([
    apiFetch('/tracks', { q, limit: '50', linked_partitioning: '1' }).catch(() => ({ collection: [] })),
    apiFetch('/playlists', { q, limit: '50', linked_partitioning: '1' }).catch(() => ({ collection: [] })),
  ]);

  const tracks = (tracksData.collection || []).map(normalizeTrack);
  const playlists = (playlistsData.collection || []).map(normalizePlaylist);

  return { tracks, playlists };
}

export async function getMyPlaylists(): Promise<any[]> {
  const data = await apiFetch('/me/playlists', { limit: '50', linked_partitioning: '1' }).catch(() => ({ collection: [] }));
  return (data.collection || []).map(normalizePlaylist);
}

export async function getLikedTracks(): Promise<any[]> {
  // /me/likes/tracks returns like objects with a 'track' field
  const data = await apiFetch('/me/likes/tracks', { limit: '50', linked_partitioning: '1' }).catch(() => ({ collection: [] }));
  return (data.collection || [])
    .map((item: any) => item?.track)
    .filter(Boolean)
    .map(normalizeTrack);
}

export async function getPlaylistTracks(playlistId: string): Promise<any[]> {
  const data = await apiFetch(`/playlists/${playlistId}`, {}).catch(() => null);
  if (!data || !data.tracks) return [];
  return data.tracks.map(normalizeTrack);
}

export async function getStreamUrl(trackId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const token = await soundcloudAuth.getValidAccessToken();
    const res = await fetch(`${API_BASE}/tracks/${trackId}/streams`, {
      headers: { Authorization: `OAuth ${token}` },
    });
    if (!res.ok) throw new Error(`Stream fetch failed: ${res.status}`);
    const data = await res.json();
    // SoundCloud returns progressive mp3 and hls urls; prefer progressive
    const url = data.http_mp3_128_url || data.hls_mp3_128_url || data.preview_mp3_128_url;
    if (!url) throw new Error('No stream URL available');
    return { success: true, url };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
