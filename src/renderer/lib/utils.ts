import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function getYouTubeVideoId(uri: string): string | null {
  if (!uri) return null;
  const m = uri.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function convertMusicUrlToYouTube(url: string): string {
  if (!url) return url;
  return url.replace('music.youtube.com', 'www.youtube.com');
}

