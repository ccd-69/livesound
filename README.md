 ## LiveSound 1.0.0 — Official Release

  ### Features
  - **YouTube in-app playback** — 4 modes: IFrame embed, Direct Stream (yt-dlp), WebView, and full YouTube Music web
  player
  - **Spotify Web Playback SDK** — Full integration with global play/pause, next/previous, seek, and volume
  - **Glassmorphism UI** — Frosted glass effects across sidebar, player bar, title bar, and settings
  - **Now Playing screen** — Large animated album art with blurred background, progress bar, and full controls
  - **Audio visualizer** — Simulated equalizer and spectrum analyzer with spring physics animations
  - **Settings panel** — YouTube playback mode selector, visualizer toggles, theme picker
  - **Media key support** — Play/pause, next, previous via keyboard and OS media keys
  - **Cross-platform** — Windows installer with auto-updater support

  ### Technical Highlights
  - Embedded HTTP server in production to serve renderer with a real origin (fixes YouTube Error 153)
  - Unified YoutubeController pattern for play/pause across all 4 YouTube modes
  - Tailwind CSS v3 with custom theme tokens and glassmorphism utilities
  - Motion (Framer Motion) for all animations
