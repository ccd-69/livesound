import { contextBridge, ipcRenderer } from 'electron';

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

  // SoundCloud
  startSoundCloudAuth: () => ipcRenderer.invoke('start-soundcloud-auth'),
  soundCloudLogout: () => ipcRenderer.invoke('soundcloud-logout'),
  setSoundCloudCredentials: (id: string, secret: string) => ipcRenderer.invoke('set-soundcloud-credentials', id, secret),
  syncSoundCloudLibrary: () => ipcRenderer.invoke('sync-soundcloud-library'),
  soundCloudGetStreamUrl: (trackId: string) => ipcRenderer.invoke('soundcloud-get-stream-url', trackId),
  syncSoundCloudFree: (profileUrl: string) => ipcRenderer.invoke('sync-soundcloud-free', profileUrl),
  soundCloudFreeSearch: (query: string) => ipcRenderer.invoke('soundcloud-free-search', query),

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

  // Local unified playlists
  createLocalPlaylist: (name: string, description?: string) => ipcRenderer.invoke('create-local-playlist', name, description),
  updateLocalPlaylist: (playlistId: string, updates: any) => ipcRenderer.invoke('update-local-playlist', playlistId, updates),
  deleteLocalPlaylist: (playlistId: string) => ipcRenderer.invoke('delete-local-playlist', playlistId),
  loadLocalPlaylists: () => ipcRenderer.invoke('load-local-playlists'),
  addTrackToLocalPlaylist: (playlistId: string, track: any) => ipcRenderer.invoke('add-track-to-local-playlist', playlistId, track),
  removeTrackFromLocalPlaylist: (playlistId: string, trackId: string) => ipcRenderer.invoke('remove-track-from-local-playlist', playlistId, trackId),

  // Search
  searchAll: (query: string, musicOnly?: boolean, platforms?: any) => ipcRenderer.invoke('search-all', query, musicOnly, platforms),

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

  // Discord Rich Presence
  discordSetActivity: (activity: any) => ipcRenderer.invoke('discord-set-activity', activity),
  discordClearActivity: () => ipcRenderer.invoke('discord-clear-activity'),
  discordConnect: () => ipcRenderer.invoke('discord-connect'),
  discordDisconnect: () => ipcRenderer.invoke('discord-disconnect'),

  // Mini Player
  showMiniPlayer: () => ipcRenderer.invoke('mini-player-show'),
  hideMiniPlayer: () => ipcRenderer.invoke('mini-player-hide'),
  closeMiniPlayer: () => ipcRenderer.invoke('mini-player-close'),
  isMiniPlayerOpen: () => ipcRenderer.invoke('mini-player-is-open'),
  onMiniPlayerState: (cb: (state: any) => void) => {
    const listener = (_event: any, state: any) => cb(state);
    ipcRenderer.on('mini-player-state', listener);
    return () => ipcRenderer.removeListener('mini-player-state', listener);
  },
  sendMiniPlayerState: (state: any) => ipcRenderer.invoke('send-mini-player-state', state),

  // Media controls from mini player
  playPauseMedia: () => ipcRenderer.invoke('media-play-pause-from-mini'),
  nextMedia: () => ipcRenderer.invoke('media-next-from-mini'),
  previousMedia: () => ipcRenderer.invoke('media-previous-from-mini'),

  // Listening History
  appendHistoryEvent: (event: any) => ipcRenderer.invoke('append-history-event', event),
  finalizeHistoryEvent: (trackId: string, endedAt: number) => ipcRenderer.invoke('finalize-history-event', trackId, endedAt),
  loadHistory: () => ipcRenderer.invoke('load-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Related Tracks / Autoplay
  youtubeGetRelated: (videoId: string, maxResults?: number) => ipcRenderer.invoke('youtube-get-related', videoId, maxResults),
  spotifyGetRecommendations: (seedTrackId: string, limit?: number) => ipcRenderer.invoke('spotify-get-recommendations', seedTrackId, limit),

});
