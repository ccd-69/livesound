const LRCLIB_API = 'https://lrclib.net/api';

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsResult {
  syncType: 'line-synced' | 'unsynced' | 'not-found';
  lines: LyricLine[];
  raw?: string;
}

function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const timeRegex = /\[(\d+):(\d+\.?\d*)\](.*)/;

  for (const line of lrc.split('\n')) {
    const match = timeRegex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        lines.push({
          time: (minutes * 60 + seconds) * 1000,
          text,
        });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

export async function fetchLyrics(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number
): Promise<LyricsResult> {
  if (!trackName || !artistName) {
    return { syncType: 'not-found', lines: [] };
  }

  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });
    if (albumName) params.append('album_name', albumName);
    if (duration) params.append('duration', String(Math.round(duration / 1000)));

    const response = await fetch(`${LRCLIB_API}/get?${params.toString()}`, {
      headers: { 'Lrclib-Client': 'LiveSound/1.0.6 (https://github.com/coolcatdude/livesound)' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { syncType: 'not-found', lines: [] };
      }
      throw new Error(`LRCLIB API error: ${response.status}`);
    }

    const data = await response.json();

    // Try synced lyrics first, then plain
    const lrcText = data.syncedLyrics || data.plainLyrics;
    if (!lrcText) {
      return { syncType: 'not-found', lines: [] };
    }

    if (data.syncedLyrics) {
      const lines = parseLRC(data.syncedLyrics);
      return {
        syncType: lines.length > 0 ? 'line-synced' : 'unsynced',
        lines,
        raw: data.syncedLyrics,
      };
    }

    // Plain lyrics — no timestamps
    const plainLines = lrcText.split('\n').filter((l: string) => l.trim());
    return {
      syncType: 'unsynced',
      lines: plainLines.map((text: string) => ({ time: 0, text: text.trim() })),
      raw: data.plainLyrics,
    };
  } catch (err) {
    console.warn('[Lyrics] Fetch failed:', (err as Error).message);
    return { syncType: 'not-found', lines: [] };
  }
}
