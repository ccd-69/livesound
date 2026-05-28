// Unified music types for cross-platform playback

export type MusicPlatform = 'spotify' | 'youtube' | 'soundcloud' | 'local';

export interface TrackSource {
  platform: MusicPlatform;
  externalId: string;       // spotify URI, youtube videoId, soundcloud trackId
  playable: boolean;        // Can we currently play this?
  priority: number;         // User preference order (lower = higher priority)
  streamUrl?: string;       // Cached direct stream URL
}

export interface UnifiedTrack {
  id: string;               // LiveSound internal UUID (generated)
  title: string;
  artist: string;
  album?: string;
  durationMs: number;
  image?: string;
  sources: TrackSource[];
  // Convenience fields for backward compat with existing UI
  name?: string;            // Alias for title
  source?: MusicPlatform;    // Primary source (first in sources array)
  uri?: string;             // Primary external URI
  streamable?: boolean;
  videoId?: string;         // YouTube-specific
  channelTitle?: string;    // YouTube-specific
  thumbnail?: string;       // YouTube-specific
}

export interface UnifiedPlaylist {
  id: string;               // LiveSound internal UUID
  name: string;
  description?: string;
  image?: string;
  owner: string;            // Usually 'LiveSound' or service username
  tracks: UnifiedTrack[];
  createdAt: number;
  updatedAt: number;
  source?: MusicPlatform;   // If imported from a service
  externalId?: string;      // Original service playlist ID
  trackCount: number;
}

export interface UnifiedAlbum {
  id: string;
  name: string;
  artist: string;
  image?: string;
  tracks?: UnifiedTrack[];
  source: MusicPlatform;
  externalId: string;
}

// Helper to create a UnifiedTrack from a single-platform track object
export function createUnifiedTrack(
  platform: MusicPlatform,
  externalId: string,
  title: string,
  artist: string,
  opts?: {
    album?: string;
    durationMs?: number;
    image?: string;
    streamUrl?: string;
    playable?: boolean;
    priority?: number;
    uri?: string;
    videoId?: string;
    channelTitle?: string;
    thumbnail?: string;
  }
): UnifiedTrack {
  const source: TrackSource = {
    platform,
    externalId,
    playable: opts?.playable ?? true,
    priority: opts?.priority ?? 0,
    streamUrl: opts?.streamUrl,
  };

  return {
    id: `${platform}-${externalId}`,
    title,
    artist,
    album: opts?.album,
    durationMs: opts?.durationMs ?? 0,
    image: opts?.image,
    sources: [source],
    name: title,
    source: platform,
    uri: opts?.uri,
    streamable: source.playable,
    videoId: opts?.videoId,
    channelTitle: opts?.channelTitle,
    thumbnail: opts?.thumbnail,
  };
}

// Helper to add a source to an existing UnifiedTrack
export function addTrackSource(track: UnifiedTrack, source: TrackSource): UnifiedTrack {
  const existing = track.sources.find((s) => s.platform === source.platform && s.externalId === source.externalId);
  if (existing) {
    // Update existing source
    Object.assign(existing, source);
  } else {
    track.sources.push(source);
    // Re-sort by priority
    track.sources.sort((a, b) => a.priority - b.priority);
  }
  return track;
}

// Helper to get the best playable source
export function getBestSource(track: UnifiedTrack, connectedPlatforms: MusicPlatform[]): TrackSource | null {
  const playable = track.sources.filter((s) => s.playable && connectedPlatforms.includes(s.platform));
  if (!playable.length) return null;
  return playable[0]; // Already sorted by priority
}

// Normalize a raw track from any service into UnifiedTrack
export function normalizeToUnifiedTrack(raw: any): UnifiedTrack {
  const platform = raw.source as MusicPlatform;
  const externalId = raw.id || raw.uri || raw.videoId || '';

  return createUnifiedTrack(platform, externalId, raw.name || raw.title || 'Untitled', raw.artist || raw.channelTitle || 'Unknown', {
    album: raw.album?.name || raw.album,
    durationMs: raw.durationMs || 0,
    image: raw.album?.images?.[0]?.url || raw.image || raw.thumbnail,
    playable: raw.streamable !== false,
    uri: raw.uri || raw.permalink_url,
    videoId: raw.videoId,
    channelTitle: raw.channelTitle,
    thumbnail: raw.thumbnail,
  });
}
