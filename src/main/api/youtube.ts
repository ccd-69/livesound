import * as youtubeAuth from '../auth/youtube.js';
import { withRateLimit } from '../lib/rateLimiter.js';

export async function getMyPlaylists(): Promise<any[]> {
  return withRateLimit('youtube:playlists', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const res = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) {
      throw new Error(
        'No YouTube channel found for this Google account. Please visit youtube.com and create a channel first.',
      );
    }
    if (!res.ok) throw new Error(`YouTube playlists fetch failed: ${res.status}`);
    const data = await res.json();
    return (data.items || []).map((p: any) => ({
      id: p.id,
      name: p.snippet?.title || 'Untitled',
      owner: p.snippet?.channelTitle || 'You',
      image: p.snippet?.thumbnails?.medium?.url || p.snippet?.thumbnails?.default?.url || '',
      source: 'youtube',
      trackCount: p.contentDetails?.itemCount ?? 0,
      createdAt: p.snippet?.publishedAt ? new Date(p.snippet.publishedAt).getTime() : Date.now(),
    }));
  }, 5, 1000);
}

export async function getPlaylistTracks(playlistId: string): Promise<any[]> {
  return withRateLimit('youtube:tracks', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`YouTube playlist items fetch failed: ${res.status}`);
    const data = await res.json();
    return (data.items || []).map((item: any) => {
      const s = item.snippet;
      return {
        id: s.resourceId?.videoId || item.id,
        name: s.title || 'Untitled',
        artist: s.videoOwnerChannelTitle || s.channelTitle || 'YouTube',
        album: '',
        durationMs: 0,
        image: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || '',
        source: 'youtube',
        uri: `https://music.youtube.com/watch?v=${s.resourceId?.videoId || ''}`,
      };
    });
  }, 5, 1000);
}

function extractYouTubeId(input: string): { type: 'video' | 'playlist' | null; id: string | null } {
  const trimmed = input.trim();
  let m = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (m) return { type: 'video', id: m[1] };
  m = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m) return { type: 'video', id: m[1] };
  m = trimmed.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (m) return { type: 'video', id: m[1] };
  m = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (m) return { type: 'playlist', id: m[1] };
  return { type: null, id: null };
}

async function fetchSearchPage(token: string, q: string, pageToken?: string, musicOnly?: boolean) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'video,playlist');
  url.searchParams.set('maxResults', '50');
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  if (musicOnly) url.searchParams.set('videoCategoryId', '10');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);
  return res.json();
}

export async function searchYouTube(q: string, musicOnly = false): Promise<{ tracks: any[]; playlists: any[] }> {
  return withRateLimit('youtube:search', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const urlInfo = extractYouTubeId(q);

    if (urlInfo.type === 'video' && urlInfo.id) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${urlInfo.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`YouTube video lookup failed: ${res.status}`);
      const data = await res.json();
      const item = data.items?.[0];
      if (!item) return { tracks: [], playlists: [] };
      const track = {
        id: item.id,
        name: item.snippet?.title || 'Untitled',
        artist: item.snippet?.channelTitle || 'YouTube',
        album: '',
        durationMs: 0,
        image: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        source: 'youtube',
        uri: `https://music.youtube.com/watch?v=${item.id}`,
      };
      return { tracks: [track], playlists: [] };
    }

    if (urlInfo.type === 'playlist' && urlInfo.id) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${urlInfo.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`YouTube playlist lookup failed: ${res.status}`);
      const data = await res.json();
      const item = data.items?.[0];
      if (!item) return { tracks: [], playlists: [] };
      const playlist = {
        id: item.id,
        name: item.snippet?.title || 'Untitled',
        owner: item.snippet?.channelTitle || 'YouTube',
        image: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        source: 'youtube',
        trackCount: 0,
      };
      return { tracks: [], playlists: [playlist] };
    }

    const tracks: any[] = [];
    const playlists: any[] = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const data = await fetchSearchPage(token, q, pageToken, musicOnly);
      pages++;

      for (const item of data.items || []) {
        if (item.id?.kind === 'youtube#video') {
          tracks.push({
            id: item.id.videoId,
            name: item.snippet?.title || 'Untitled',
            artist: item.snippet?.channelTitle || 'YouTube',
            album: '',
            durationMs: 0,
            image: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
            source: 'youtube',
            uri: `https://music.youtube.com/watch?v=${item.id.videoId}`,
          });
        } else if (item.id?.kind === 'youtube#playlist') {
          playlists.push({
            id: item.id.playlistId,
            name: item.snippet?.title || 'Untitled',
            owner: item.snippet?.channelTitle || 'YouTube',
            image: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
            source: 'youtube',
            trackCount: 0,
          });
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken && pages < 2);

    return { tracks, playlists };
  }, 3, 1000);
}

export async function createPlaylist(name: string): Promise<{ id: string; name: string; image: string; createdAt: number }> {
  return withRateLimit('youtube:create', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const res = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: { title: name, description: 'Created from LiveSound' },
        status: { privacyStatus: 'private' },
      }),
    });
    if (!res.ok) throw new Error(`Create playlist failed: ${res.status}`);
    const data = await res.json();
    const snippet = data.snippet || {};
    return {
      id: data.id,
      name: snippet.title || name,
      image: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
      createdAt: Date.now(),
    };
  }, 2, 1000);
}

export async function addVideoToPlaylist(playlistId: string, videoId: string): Promise<void> {
  return withRateLimit('youtube:add', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const res = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: { kind: 'youtube#video', videoId },
        },
      }),
    });
    if (!res.ok) throw new Error(`Add to playlist failed: ${res.status}`);
  }, 5, 1000);
}

function parseISODuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

export async function getVideoDetails(videoId: string): Promise<any> {
  return withRateLimit('youtube:details', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Video details fetch failed: ${res.status}`);
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    const durationIso = item.contentDetails?.duration || '';
    return {
      id: item.id,
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      viewCount: item.statistics?.viewCount || '0',
      likeCount: item.statistics?.likeCount || '0',
      commentCount: item.statistics?.commentCount || '0',
      durationMs: parseISODuration(durationIso),
    };
  }, 10, 1000);
}

export async function getVideoComments(videoId: string): Promise<any[]> {
  return withRateLimit('youtube:comments', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=20&order=relevance`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Comments fetch failed: ${res.status}`);
    const data = await res.json();
    return (data.items || []).map((item: any) => {
      const snippet = item.snippet?.topLevelComment?.snippet || {};
      return {
        id: item.id,
        author: snippet.authorDisplayName || 'Unknown',
        authorImage: snippet.authorProfileImageUrl || '',
        text: snippet.textDisplay || '',
        likeCount: snippet.likeCount || 0,
        publishedAt: snippet.publishedAt || '',
        replyCount: item.snippet?.totalReplyCount || 0,
      };
    });
  }, 5, 1000);
}

export async function postVideoComment(videoId: string, text: string): Promise<void> {
  return withRateLimit('youtube:post', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const res = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          videoId,
          topLevelComment: {
            snippet: { textOriginal: text },
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`Post comment failed: ${res.status}`);
  }, 2, 1000);
}
