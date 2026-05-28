# LiveSound Release Notes

## v1.0.6 (2026-05-28)

### New Features
- **SoundCloud Free Integration** — Full search, browse, and playback via SoundCloud's public API. No developer account or Go+ subscription required. Artwork and progressive MP3 streams work out of the box.
- **Local Playlists** — Create cross-platform playlists that can hold tracks from Spotify, YouTube, and SoundCloud. Add any track to a local playlist from the search results or Now Playing queue.
- **Platform Search Filters** — Toggle which platforms to search (Spotify, YouTube, SoundCloud) with auth-aware disabled states.
- **Channel-First YouTube Search** — YouTube results now prioritize an artist's official channel uploads, supplemented by a refined generic search. Shorts and livestreams are filtered out.
- **Autoplay Related Tracks** — Automatically plays related videos when a YouTube queue ends, and Spotify recommendations when a Spotify track ends.
- **Listening History** — Track every song you play with time-filtered stats (All Time, Today, This Week). View Total Time, Tracks Played, Top Track, and Top Artist.

### Improvements
- **Add to Playlist** now works for all platforms, not just YouTube.
- **SoundCloud playback** uses direct `fetch()` in the main process for reliable stream URL resolution.
- **Spotify auth** rewritten to intercept OAuth redirects inside the popup window — no local HTTPS server needed.
- **Content Security Policy** updated to allow SoundCloud CDN domains (`*.sndcdn.com`).
- Added `webSecurity: false` on the main `BrowserWindow` to allow cross-origin audio playback from SoundCloud.
- Service status pills in Library now act as connect/disconnect toggle buttons.

### Known Issues
- **Spotify Premium Required** — Spotify now requires an active Premium subscription on the developer account to access the Web API. A notice is shown in the Library panel.
- **Mini Player does not work.** Opening the mini player will show a blank or non-functional window. To close it, right-click the LiveSound icon in the taskbar and select "Close window" (or use Task Manager).
- Autoplay Related Tracks is implemented but may not trigger in some environments.

---

## v1.0.5 (2026-05-25)

### Bug Fixes
- Blank screen fix: Vite strictPort + kill-port for reliable dev server startup.
- Mini player redesign with video, album art, and working controls (partial).

---

## v1.0.0 – v1.0.4

### Initial Release
- Multi-source playback (Spotify, YouTube Music).
- Unified library and search.
- Discord Rich Presence, Media Session API.
- Custom themes and lyrics display.
- Auto-updater via GitHub releases.
