# LiveSound Release Notes

## v1.0.6 (2026-05-27)

### New Features
- **Enhanced Visualizations** — Three visualizer modes: Spectrum Bars, Circular, and Waveform. Switch modes in Now Playing or Settings.
- **Listening History** — Track every song you play with time-filtered stats (All Time, Today, This Week). View Total Time, Tracks Played, Top Track, and Top Artist.
- **SoundCloud Integration** — Connect your SoundCloud account to browse playlists, liked tracks, and search. Playback via progressive MP3 streams.
- **Autoplay Related Tracks** — Automatically plays related videos when a YouTube queue ends, and Spotify recommendations when a Spotify track ends.
- **Persistent Background Playback** — Audio keeps playing when you navigate away from Now Playing to Library, Search, History, or Settings.

### Improvements
- Updated app branding to include SoundCloud alongside Spotify and YouTube Music.
- Added cross-platform build assets (tray icon, Linux icon sizes).
- Added `LICENSE.txt` and `README.md`.
- Fixed `.gitignore` to include essential `build/` resources.
- Added dev process cleanup (`npm run kill-dev`) and `--kill-others` on `concurrently` for cleaner dev server shutdown.

### Known Issues
- **Mini Player does not work.** Opening the mini player will show a blank or non-functional window. To close it, right-click the LiveSound icon in the taskbar and select "Close window" (or use Task Manager).
- Autoplay Related Tracks is implemented but may not trigger in some environments.
- SoundCloud playback requires an Artist Pro account (or equivalent API access) for full end-to-end testing.

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
