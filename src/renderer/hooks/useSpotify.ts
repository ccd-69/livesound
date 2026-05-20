import { useEffect, useRef, useState, useCallback } from 'react';

interface SpotifyState {
  ready: boolean;
  deviceId: string | null;
  currentTrack: any | null;
  paused: boolean;
  position: number;
  duration: number;
  volume: number;
}

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export function useSpotifyPlayer() {
  const playerRef = useRef<any>(null);
  const deviceIdRef = useRef<string | null>(null);
  const [state, setState] = useState<SpotifyState>({
    ready: false,
    deviceId: null,
    currentTrack: null,
    paused: true,
    position: 0,
    duration: 0,
    volume: 0.5,
  });

  const init = useCallback(async () => {
    if (playerRef.current) return;
    if (!window.Spotify) {
      await loadSdk();
    }
    await initializePlayer();
  }, []);

  function loadSdk(): Promise<void> {
    return new Promise((resolve) => {
      if (document.getElementById('spotify-sdk')) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.id = 'spotify-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  async function initializePlayer() {
    if (!window.Spotify) return;

    const player = new window.Spotify.Player({
      name: 'LiveSound',
      getOAuthToken: (cb: (t: string) => void) => {
        window.electronAPI
          .getSpotifyToken()
          .then(cb)
          .catch(() => cb(''));
      },
      volume: 0.5,
    });

    player.addListener('ready', ({ device_id }: any) => {
      console.log('[Spotify] Ready with device_id', device_id);
      deviceIdRef.current = device_id;
      setState((s) => ({ ...s, ready: true, deviceId: device_id }));
    });

    player.addListener('not_ready', () => {
      setState((s) => ({ ...s, ready: false, deviceId: null }));
    });

    player.addListener('player_state_changed', (ps: any) => {
      if (!ps) return;
      setState({
        ready: true,
        deviceId: deviceIdRef.current,
        currentTrack: ps.track_window?.current_track ?? null,
        paused: ps.paused,
        position: ps.position,
        duration: ps.duration,
        volume: ps.volume ?? 0.5,
      });
    });

    await player.connect();
    playerRef.current = player;
  }

  const togglePlay = useCallback(() => {
    playerRef.current?.togglePlay();
  }, []);

  const nextTrack = useCallback(() => {
    playerRef.current?.nextTrack();
  }, []);

  const previousTrack = useCallback(() => {
    playerRef.current?.previousTrack();
  }, []);

  const seek = useCallback((pos: number) => {
    playerRef.current?.seek(pos);
  }, []);

  const setVolume = useCallback((vol: number) => {
    playerRef.current?.setVolume(vol);
  }, []);

  const playTrack = useCallback(async (uri: string) => {
    if (!deviceIdRef.current) {
      // Try to initialize if not ready
      if (!playerRef.current) {
        await init();
      }
    }

    // Wait a moment for device_id if we just initialized
    const deviceId = deviceIdRef.current;
    if (!deviceId) {
      console.error('[Spotify] No device ID available');
      return;
    }

    try {
      await window.electronAPI.spotifyPlayTrack(uri, deviceId);
    } catch (err: any) {
      console.error('[Spotify] Play failed:', err.message || err);
    }
  }, [init]);

  return {
    ...state,
    init,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    playTrack,
  };
}
