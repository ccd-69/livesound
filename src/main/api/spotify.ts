import * as spotifyAuth from '../auth/spotify.js';
import { withRateLimit } from '../lib/rateLimiter.js';

export async function getMyPlaylists(): Promise<any[]> {
  return withRateLimit('spotify:playlists', async () => {
    const token = await spotifyAuth.getValidAccessToken();
    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Spotify playlists fetch failed: ${res.status}`);
    const data = await res.json();
    return (data.items || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      owner: p.owner?.display_name || 'Unknown',
      image: p.images?.[0]?.url || '',
      source: 'spotify',
      trackCount: p.tracks?.total ?? 0,
    }));
  }, 5, 1000);
}

export async function getSavedAlbums(): Promise<any[]> {
  return withRateLimit('spotify:albums', async () => {
    const token = await spotifyAuth.getValidAccessToken();
    const res = await fetch('https://api.spotify.com/v1/me/albums?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Spotify albums fetch failed: ${res.status}`);
    const data = await res.json();
    return (data.items || []).map((item: any) => {
      const a = item.album;
      return {
        id: a.id,
        name: a.name,
        artist: a.artists?.map((x: any) => x.name).join(', ') || 'Unknown',
        image: a.images?.[0]?.url || '',
        source: 'spotify',
      };
    });
  }, 5, 1000);
}

export async function getPlaylistTracks(playlistId: string): Promise<any[]> {
  return withRateLimit('spotify:tracks', async () => {
    const token = await spotifyAuth.getValidAccessToken();
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Spotify tracks fetch failed: ${res.status}`);
    const data = await res.json();
    return (data.items || []).map((item: any) => {
      const t = item.track;
      if (!t) return null;
      return {
        id: t.id,
        name: t.name,
        artist: t.artists?.map((x: any) => x.name).join(', ') || 'Unknown',
        album: t.album?.name || '',
        durationMs: t.duration_ms,
        image: t.album?.images?.[0]?.url || '',
        source: 'spotify',
        uri: t.uri,
      };
    }).filter(Boolean);
  }, 5, 1000);
}

export async function searchSpotify(q: string): Promise<{ tracks: any[]; albums: any[]; playlists: any[] }> {
  return withRateLimit('spotify:search', async () => {
    const token = await spotifyAuth.getValidAccessToken();
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track,album,playlist&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
    const data = await res.json();

    const tracks = (data.tracks?.items || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      artist: t.artists?.map((x: any) => x.name).join(', ') || 'Unknown',
      album: t.album?.name || '',
      durationMs: t.duration_ms,
      image: t.album?.images?.[0]?.url || '',
      source: 'spotify',
      uri: t.uri,
    }));

    const albums = (data.albums?.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      artist: a.artists?.map((x: any) => x.name).join(', ') || 'Unknown',
      image: a.images?.[0]?.url || '',
      source: 'spotify',
    }));

    const playlists = (data.playlists?.items || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      owner: p.owner?.display_name || 'Unknown',
      image: p.images?.[0]?.url || '',
      source: 'spotify',
      trackCount: p.tracks?.total ?? 0,
    }));

    return { tracks, albums, playlists };
  }, 3, 1000);
}

export async function getRecommendations(seedTrackId: string, limit = 10): Promise<any[]> {
  return withRateLimit('spotify:recommendations', async () => {
    const token = await spotifyAuth.getValidAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrackId}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Spotify recommendations fetch failed: ${res.status}`);
    const data = await res.json();
    return (data.tracks || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      artist: t.artists?.map((x: any) => x.name).join(', ') || 'Unknown',
      album: t.album?.name || '',
      durationMs: t.duration_ms,
      image: t.album?.images?.[0]?.url || '',
      source: 'spotify',
      uri: t.uri,
    }));
  }, 3, 1000);
}
