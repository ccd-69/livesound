/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getAppVersion: () => Promise<string>;
    getUpdateStatus: () => Promise<{ status: string; version?: string; error?: string }>;
    checkForUpdates: () => Promise<void>;
    installUpdate: () => Promise<void>;
    onUpdateStatus: (cb: (payload: { status: string; version?: string; error?: string }) => void) => () => void;
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
    syncSpotifyLibrary: () => Promise<{ playlists: any[]; albums: any[] }>;
    syncYouTubeLibrary: () => Promise<{ playlists: any[] }>;
    getPlaylistTracks: (playlistId: string, source: string) => Promise<any[]>;
    loadCachedLibrary: () => Promise<{ playlists: any[]; albums: any[]; tracks: any[] }>;
    createYouTubePlaylist: (name: string) => Promise<{ id: string; name: string; image: string }>;
    addToYouTubePlaylist: (playlistId: string, videoId: string) => Promise<void>;
    patchPlaylistImage: (playlistId: string, image: string) => Promise<void>;
    appendPlaylist: (playlist: any) => Promise<void>;
    searchAll: (query: string, musicOnly?: boolean) => Promise<{ tracks: any[]; albums: any[]; playlists: any[] }>;
    openExternal: (url: string) => Promise<void>;
    clearCache: () => Promise<void>;
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    isWindowMaximized: () => Promise<boolean>;
    onMediaPlayPause: (cb: () => void) => () => void;
    onMediaNext: (cb: () => void) => () => void;
    onMediaPrevious: (cb: () => void) => () => void;
  };
}
