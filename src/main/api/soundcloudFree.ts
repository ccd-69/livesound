import SoundCloud from 'soundcloud-fetch';

const sc = new SoundCloud();
const API_V2 = 'https://api-v2.soundcloud.com';

async function getClientID(): Promise<string> {
  return sc.getClientId();
}

function fixArtworkUrl(url: string | null): string {
  if (!url) return '';
  // SoundCloud artwork URLs end in -large.jpg; replace with -t500x500.jpg
  // Also handle other known suffixes
  return url.replace(/-(small|normal|large|t300x300|crop|t67x67|badge|tiny|mini)\.(jpg|png)$/i, '-t500x500.$2');
}

function normalizeTrack(t: any) {
  if (!t || typeof t !== 'object') return null;
  const user = t.user || {};
  const artwork = fixArtworkUrl(t.artwork_url) || fixArtworkUrl(user.avatar_url) || '';
  return {
    id: String(t.id ?? ''),
    name: t.title || 'Untitled',
    artist: user.username || 'SoundCloud',
    album: '',
    durationMs: t.duration || 0,
    image: artwork,
    source: 'soundcloud',
    uri: t.permalink_url || `https://soundcloud.com/tracks/${t.id}`,
    streamable: t.streamable !== false,
  };
}

function normalizePlaylist(p: any) {
  if (!p || typeof p !== 'object') return null;
  const user = p.user || {};
  const artwork = fixArtworkUrl(p.artwork_url) || fixArtworkUrl(user.avatar_url) || '';
  return {
    id: String(p.id ?? ''),
    name: p.title || 'Untitled',
    owner: user.username || 'SoundCloud',
    image: artwork,
    source: 'soundcloud',
    trackCount: p.track_count || 0,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    permalink_url: p.permalink_url,
  };
}

export async function searchSoundCloudFree(q: string, limit = 50): Promise<{ tracks: any[]; playlists: any[] }> {
  try {
    const clientID = await getClientID();
    const [tracksRes, playlistsRes] = await Promise.all([
      fetch(`${API_V2}/search/tracks?q=${encodeURIComponent(q)}&client_id=${clientID}&limit=${limit}&offset=0`).then((r) => r.json()),
      fetch(`${API_V2}/search/playlists?q=${encodeURIComponent(q)}&client_id=${clientID}&limit=${limit}&offset=0`).then((r) => r.json()),
    ]);

    const tracks = (tracksRes?.collection || [])
      .map(normalizeTrack)
      .filter(Boolean);
    const playlists = (playlistsRes?.collection || [])
      .map(normalizePlaylist)
      .filter(Boolean);
    return { tracks, playlists };
  } catch (err: any) {
    console.error('[SoundCloudFree] Search failed:', err.message);
    return { tracks: [], playlists: [] };
  }
}

export async function getStreamUrlFree(trackId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const clientID = await getClientID();
    const trackRes = await fetch(`${API_V2}/tracks/${trackId}?client_id=${clientID}`);
    if (!trackRes.ok) throw new Error(`Track fetch failed: ${trackRes.status}`);
    const track = await trackRes.json();
    if (!track.media?.transcodings?.length) throw new Error('No transcodings');

    const progressive = track.media.transcodings.find(
      (t: any) => t.format?.protocol === 'progressive' && t.format?.mime_type === 'audio/mpeg'
    );
    if (!progressive) throw new Error('No progressive MP3');

    // Some tracks require track_authorization for stream access
    const trackAuth = track.track_authorization || '';
    const mediaUrl = `${progressive.url}?client_id=${clientID}${trackAuth ? `&track_authorization=${trackAuth}` : ''}`;
    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) throw new Error(`Media fetch failed: ${mediaRes.status}`);
    const mediaData = await mediaRes.json();
    if (!mediaData.url) throw new Error('No stream URL');
    return { success: true, url: mediaData.url };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function resolveUrl(url: string): Promise<any> {
  const clientID = await getClientID();
  const res = await fetch(`${API_V2}/resolve?url=${encodeURIComponent(url)}&client_id=${clientID}`);
  if (!res.ok) throw new Error(`Resolve failed: ${res.status}`);
  return res.json();
}

export async function getUserLikes(profileUrl: string, limit = 50): Promise<any[]> {
  try {
    const user = await resolveUrl(profileUrl);
    if (!user?.id) {
      console.error('[SoundCloudFree] Could not resolve user from URL');
      return [];
    }
    const clientID = await getClientID();
    const res = await fetch(`${API_V2}/users/${user.id}/likes?client_id=${clientID}&limit=${limit}&offset=0`);
    const data = await res.json();
    return (data?.collection || [])
      .filter((item: any) => item?.track)
      .map((item: any) => normalizeTrack(item.track))
      .filter(Boolean);
  } catch (err: any) {
    console.error('[SoundCloudFree] getUserLikes failed:', err.message);
    return [];
  }
}

export async function getUserPlaylists(profileUrl: string, limit = 50): Promise<any[]> {
  try {
    const user = await resolveUrl(profileUrl);
    if (!user?.id) {
      console.error('[SoundCloudFree] Could not resolve user from URL');
      return [];
    }
    const clientID = await getClientID();
    const res = await fetch(`${API_V2}/users/${user.id}/playlists?client_id=${clientID}&limit=${limit}&offset=0`);
    const data = await res.json();
    return (data?.collection || [])
      .map(normalizePlaylist)
      .filter(Boolean);
  } catch (err: any) {
    console.error('[SoundCloudFree] getUserPlaylists failed:', err.message);
    return [];
  }
}

export async function getPlaylistTracksFree(playlistId: string): Promise<any[]> {
  try {
    const clientID = await getClientID();
    const res = await fetch(`${API_V2}/playlists/${playlistId}?client_id=${clientID}`);
    const data = await res.json();
    return (data?.tracks || [])
      .map(normalizeTrack)
      .filter(Boolean);
  } catch (err: any) {
    console.error('[SoundCloudFree] getPlaylistTracksFree failed:', err.message);
    return [];
  }
}
