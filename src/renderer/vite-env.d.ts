/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getAppVersion: () => Promise<string>;
    getUpdateStatus: () => Promise<{ status: string; version?: string; error?: string; progress?: number }>;
    checkForUpdates: () => Promise<void>;
    downloadUpdate: () => Promise<void>;
    installUpdate: () => Promise<void>;
    onUpdateStatus: (cb: (payload: { status: string; version?: string; error?: string; progress?: number }) => void) => () => void;
    getSettings: () => Promise<Record<string, any>>;
    saveSettings: (settings: Record<string, any>) => Promise<void>;
    getSpotifyToken: () => Promise<string>;
    spotifyPlayTrack: (uri: string, deviceId: string) => Promise<void>;
    startSpotifyAuth: () => Promise<void>;
    spotifyLogout: () => Promise<void>;
    setSpotifyClientId: (id: string) => Promise<void>;
    startYouTubeAuth: () => Promise<void>;
    youTubeLogout: () => Promise<void>;
    setYouTubeCredentials: (id: string, secret: string) => Promise<void>;
    startSoundCloudAuth: () => Promise<void>;
    soundCloudLogout: () => Promise<void>;
    setSoundCloudCredentials: (id: string, secret: string) => Promise<void>;
    syncSoundCloudLibrary: () => Promise<{ playlists: any[]; tracks: any[] }>;
    soundCloudGetStreamUrl: (trackId: string) => Promise<{ success: boolean; url?: string; error?: string }>;
    syncSoundCloudFree: (profileUrl: string) => Promise<{ playlists: any[]; tracks: any[] }>;
    soundCloudFreeSearch: (query: string) => Promise<{ tracks: any[]; playlists: any[] }>;
    syncSpotifyLibrary: () => Promise<{ playlists: any[]; albums: any[] }>;
    syncYouTubeLibrary: () => Promise<{ playlists: any[] }>;
    getPlaylistTracks: (playlistId: string, source: string) => Promise<any[]>;
    loadCachedLibrary: () => Promise<{ playlists: any[]; albums: any[]; tracks: any[] }>;
    createYouTubePlaylist: (name: string) => Promise<{ id: string; name: string; image: string }>;
    addToYouTubePlaylist: (playlistId: string, videoId: string) => Promise<void>;
    patchPlaylistImage: (playlistId: string, image: string) => Promise<void>;
    appendPlaylist: (playlist: any) => Promise<void>;
    searchAll: (query: string, musicOnly?: boolean, platforms?: any) => Promise<{ tracks: any[]; albums: any[]; playlists: any[] }>;

    // Local unified playlists
    createLocalPlaylist: (name: string, description?: string) => Promise<any>;
    updateLocalPlaylist: (playlistId: string, updates: any) => Promise<any | null>;
    deleteLocalPlaylist: (playlistId: string) => Promise<boolean>;
    loadLocalPlaylists: () => Promise<any[]>;
    addTrackToLocalPlaylist: (playlistId: string, track: any) => Promise<any | null>;
    removeTrackFromLocalPlaylist: (playlistId: string, trackId: string) => Promise<any | null>;
    openExternal: (url: string) => Promise<void>;
    clearCache: () => Promise<void>;
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    isWindowMaximized: () => Promise<boolean>;
    onMediaPlayPause: (cb: () => void) => () => void;
    onMediaNext: (cb: () => void) => () => void;
    onMediaPrevious: (cb: () => void) => () => void;

    // YouTube Playback
    youtubeGetStreamUrl: (videoUrl: string) => Promise<{ success: boolean; url?: string; title?: string; thumbnail?: string; error?: string }>;
    youtubeCreateView: (videoId: string) => Promise<{ success: boolean; error?: string }>;
    youtubeDestroyView: () => Promise<void>;
    youtubePlayView: () => Promise<void>;
    youtubePauseView: () => Promise<void>;
    youtubeShowView: (show: boolean) => Promise<void>;
    youtubeVideoDetails: (videoId: string) => Promise<{ success: boolean; details?: any; error?: string }>;
    youtubeVideoComments: (videoId: string) => Promise<{ success: boolean; comments?: any[]; error?: string }>;
    youtubePostComment: (videoId: string, text: string) => Promise<{ success: boolean; error?: string }>;

    // Discord Rich Presence
    discordSetActivity: (activity: any) => Promise<void>;
    discordClearActivity: () => Promise<void>;
    discordConnect: () => Promise<void>;
    discordDisconnect: () => Promise<void>;

    // Mini Player
    showMiniPlayer: () => Promise<void>;
    hideMiniPlayer: () => Promise<void>;
    closeMiniPlayer: () => Promise<void>;
    isMiniPlayerOpen: () => Promise<boolean>;
    onMiniPlayerState: (cb: (state: any) => void) => () => void;
    sendMiniPlayerState: (state: any) => Promise<void>;

    // Media controls (from mini player)
    playPauseMedia: () => Promise<void>;
    nextMedia: () => Promise<void>;
    previousMedia: () => Promise<void>;

    // Listening History
    appendHistoryEvent: (event: any) => Promise<void>;
    finalizeHistoryEvent: (trackId: string, endedAt: number) => Promise<void>;
    loadHistory: () => Promise<any[]>;
    clearHistory: () => Promise<void>;

    // Related Tracks / Autoplay
    youtubeGetRelated: (videoId: string, maxResults?: number) => Promise<any[]>;
    spotifyGetRecommendations: (seedTrackId: string, limit?: number) => Promise<any[]>;

  };
}
