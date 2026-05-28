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

/** Search for channels matching the query and return their uploads. */
async function fetchChannelUploads(token: string, q: string, maxItems = 20): Promise<any[]> {
  // 1) Search for channels
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', q);
  searchUrl.searchParams.set('type', 'channel');
  searchUrl.searchParams.set('maxResults', '5');
  const searchRes = await fetch(searchUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!searchRes.ok) return [];
  const searchData = await searchRes.json();
  const channels = (searchData.items || []).map((item: any) => item.snippet?.channelId).filter(Boolean);
  if (channels.length === 0) return [];

  // 2) Get uploads playlist id for each channel
  const channelsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
  channelsUrl.searchParams.set('part', 'contentDetails');
  channelsUrl.searchParams.set('id', channels.slice(0, 3).join(','));
  channelsUrl.searchParams.set('maxResults', '3');
  const channelsRes = await fetch(channelsUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!channelsRes.ok) return [];
  const channelsData = await channelsRes.json();
  const uploadsPlaylists: string[] = [];
  for (const ch of channelsData.items || []) {
    const pid = ch.contentDetails?.relatedPlaylists?.uploads;
    if (pid) uploadsPlaylists.push(pid);
  }

  // 3) List videos from uploads playlists
  const videos: any[] = [];
  for (const pid of uploadsPlaylists) {
    if (videos.length >= maxItems) break;
    const plUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    plUrl.searchParams.set('part', 'snippet,contentDetails');
    plUrl.searchParams.set('playlistId', pid);
    plUrl.searchParams.set('maxResults', String(maxItems - videos.length));
    const plRes = await fetch(plUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!plRes.ok) continue;
    const plData = await plRes.json();
    for (const item of plData.items || []) {
      const s = item.snippet;
      if (!s?.resourceId?.videoId) continue;
      videos.push({
        id: s.resourceId.videoId,
        name: s.title || 'Untitled',
        artist: s.videoOwnerChannelTitle || s.channelTitle || 'YouTube',
        album: '',
        durationMs: 0,
        image: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || '',
        source: 'youtube',
        uri: `https://music.youtube.com/watch?v=${s.resourceId.videoId}`,
        _fromChannel: true,
      });
    }
  }
  return videos;
}

/** Fetch contentDetails (duration) for a batch of video ids and filter out Shorts. */
async function enrichWithDurations(token: string, tracks: any[]): Promise<any[]> {
  const ids = tracks.map((t) => t.id).filter(Boolean);
  if (ids.length === 0) return tracks;
  // batch in groups of 50
  const enriched: any[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50).join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) continue;
    const data = await res.json();
    for (const item of data.items || []) {
      const dur = parseISODuration(item.contentDetails?.duration || '');
      const track = tracks.find((t) => t.id === item.id);
      if (track) {
        track.durationMs = dur;
      }
    }
  }
  // Filter out Shorts (< 60s) and very long livestreams (> 2 hours)
  return tracks.filter((t) => t.durationMs >= 60000 && t.durationMs <= 7200000);
}

export async function searchYouTube(q: string, musicOnly = false): Promise<{ tracks: any[]; playlists: any[] }> {
  return withRateLimit('youtube:search', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const urlInfo = extractYouTubeId(q);

    if (urlInfo.type === 'video' && urlInfo.id) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${urlInfo.id}`,
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
        durationMs: parseISODuration(item.contentDetails?.duration || ''),
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

    // Two-pronged search:
    // A) Get official uploads from the artist's channel
    const channelTracks = await fetchChannelUploads(token, q, 20);

    // B) Refined generic search with "official audio" appended for better specificity
    const refinedQuery = `${q} official audio`;
    const genericTracks: any[] = [];
    const playlists: any[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const data = await fetchSearchPage(token, refinedQuery, pageToken, musicOnly);
      pages++;
      for (const item of data.items || []) {
        if (item.id?.kind === 'youtube#video') {
          genericTracks.push({
            id: item.id.videoId,
            name: item.snippet?.title || 'Untitled',
            artist: item.snippet?.channelTitle || 'YouTube',
            album: '',
            durationMs: 0,
            image: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
            source: 'youtube',
            uri: `https://music.youtube.com/watch?v=${item.id.videoId}`,
            _fromChannel: false,
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
    } while (pageToken && pages < 1); // only 1 page to save quota

    // Merge and deduplicate (channel uploads first)
    const seen = new Set<string>();
    const allTracks: any[] = [];
    for (const t of channelTracks) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        allTracks.push(t);
      }
    }
    for (const t of genericTracks) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        allTracks.push(t);
      }
    }

    // Enrich with durations and filter Shorts / long streams
    const filtered = await enrichWithDurations(token, allTracks);

    // Prioritize: channel uploads, then videos with "official" in title, then the rest
    const scored = filtered.map((t) => {
      let score = 0;
      if (t._fromChannel) score += 100;
      const lower = (t.name || '').toLowerCase();
      if (lower.includes('official audio')) score += 50;
      else if (lower.includes('official video')) score += 40;
      else if (lower.includes('official')) score += 20;
      return { t, score };
    });
    scored.sort((a, b) => b.score - a.score);

    return {
      tracks: scored.map((s) => {
        const { _fromChannel, ...rest } = s.t;
        return rest;
      }),
      playlists,
    };
  }, 5, 1000);
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

export async function getRelatedVideos(videoId: string, maxResults = 10): Promise<any[]> {
  return withRateLimit('youtube:related', async () => {
    const token = await youtubeAuth.getValidAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&relatedToVideoId=${videoId}&maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`YouTube related videos fetch failed: ${res.status}`);
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id?.videoId || item.id,
      name: item.snippet?.title || 'Untitled',
      artist: item.snippet?.channelTitle || 'YouTube',
      album: '',
      durationMs: 0,
      image: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      source: 'youtube',
      uri: `https://music.youtube.com/watch?v=${item.id?.videoId || item.id}`,
    }));
  }, 3, 1000);
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
