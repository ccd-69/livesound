import { contextBridge, ipcRenderer } from 'electron';
import { exposeAudioCaptureApi } from 'process-audio-capture/dist/preload.js';

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Spotify
  getSpotifyToken: () => ipcRenderer.invoke('get-spotify-token'),
  spotifyPlayTrack: (uri: string, deviceId: string) => ipcRenderer.invoke('spotify-play-track', uri, deviceId),
  startSpotifyAuth: () => ipcRenderer.invoke('start-spotify-auth'),
  spotifyLogout: () => ipcRenderer.invoke('spotify-logout'),
  setSpotifyClientId: (id: string) => ipcRenderer.invoke('set-spotify-client-id', id),

  // YouTube
  startYouTubeAuth: () => ipcRenderer.invoke('start-youtube-auth'),
  youTubeLogout: () => ipcRenderer.invoke('youtube-logout'),
  setYouTubeCredentials: (id: string, secret: string) => ipcRenderer.invoke('set-youtube-credentials', id, secret),

  // Library
  syncSpotifyLibrary: () => ipcRenderer.invoke('sync-spotify-library'),
  syncYouTubeLibrary: () => ipcRenderer.invoke('sync-youtube-library'),
  getPlaylistTracks: (playlistId: string, source: string) => ipcRenderer.invoke('get-playlist-tracks', playlistId, source),
  loadCachedLibrary: () => ipcRenderer.invoke('load-cached-library'),

  // Playlist management
  createYouTubePlaylist: (name: string) => ipcRenderer.invoke('create-youtube-playlist', name),
  addToYouTubePlaylist: (playlistId: string, videoId: string) => ipcRenderer.invoke('add-to-youtube-playlist', playlistId, videoId),
  patchPlaylistImage: (playlistId: string, image: string) => ipcRenderer.invoke('patch-playlist-image', playlistId, image),
  appendPlaylist: (playlist: any) => ipcRenderer.invoke('append-playlist', playlist),

  // Search
  searchAll: (query: string, musicOnly?: boolean) => ipcRenderer.invoke('search-all', query, musicOnly),

  // External links
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // YouTube Playback
  youtubeGetStreamUrl: (videoUrl: string) => ipcRenderer.invoke('youtube-get-stream-url', videoUrl),
  youtubeCreateView: (videoId: string) => ipcRenderer.invoke('youtube-create-view', videoId),
  youtubeDestroyView: () => ipcRenderer.invoke('youtube-destroy-view'),
  youtubePlayView: () => ipcRenderer.invoke('youtube-play-view'),
  youtubePauseView: () => ipcRenderer.invoke('youtube-pause-view'),
  youtubeShowView: (show: boolean) => ipcRenderer.invoke('youtube-show-view', show),
  youtubeVideoDetails: (videoId: string) => ipcRenderer.invoke('youtube-video-details', videoId),
  youtubeVideoComments: (videoId: string) => ipcRenderer.invoke('youtube-video-comments', videoId),
  youtubePostComment: (videoId: string, text: string) => ipcRenderer.invoke('youtube-post-comment', videoId, text),

  // Cache
  clearCache: () => ipcRenderer.invoke('clear-cache'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPid: () => ipcRenderer.invoke('get-app-pid'),

  // Updates
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (cb: (payload: { status: string; version?: string; error?: string }) => void) => {
    const listener = (_event: any, payload: any) => cb(payload);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  isWindowMaximized: () => ipcRenderer.invoke('is-window-maximized'),

  // Media key events from main
  onMediaPlayPause: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('media-play-pause', listener);
    return () => ipcRenderer.removeListener('media-play-pause', listener);
  },
  onMediaNext: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('media-next', listener);
    return () => ipcRenderer.removeListener('media-next', listener);
  },
  onMediaPrevious: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('media-previous', listener);
    return () => ipcRenderer.removeListener('media-previous', listener);
  },
});

// Expose per-process audio capture API for the visualizer
exposeAudioCaptureApi();
