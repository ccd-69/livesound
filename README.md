# LiveSound

A unified desktop music player for Spotify, YouTube Music, and SoundCloud. Built with Electron and React.

## Features

- **Multi-source playback** — Stream from Spotify, YouTube Music, and SoundCloud in one app
- **Cross-service search** — Search tracks, albums, and playlists across all connected services
- **Unified library** — Browse and play playlists and saved albums from Spotify and YouTube
- **Listening history & stats** — Track listening time, top tracks, and recently played songs
- **Enhanced visualizations** — Spectrum bars, circular, and waveform modes
- **Synced lyrics** — Auto-scrolling lyrics with active-line highlighting
- **Discord Rich Presence** — Share what you're listening to on Discord
- **Media Session API** — OS-level media controls and keyboard shortcuts
- **Custom themes** — Multiple built-in themes with a live theme picker
- **Mini player** — Compact floating window for quick control (beta)
- **Auto-updater** — Built-in update checks via GitHub releases

## Supported Platforms

| Platform | Installer | Portable |
|----------|-----------|----------|
| Windows 10/11 | NSIS `.exe` | `.exe` |
| macOS 11+ | `.dmg` | `.zip` |
| Linux | `.AppImage`, `.deb` | `.tar.gz` |

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Dev mode

```bash
npm run dev
```

### Production build

```bash
# All platforms
npm run package:all

# Windows only
npm run package:win

# macOS only
npm run package:mac

# Linux only
npm run package:linux
```

Build outputs go to `dist-installer/`.

## API Credentials

LiveSound requires API credentials for each service. You can configure them in **Settings**:

- **Spotify** — Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- **YouTube Music** — Create OAuth 2.0 credentials at [Google Cloud Console](https://console.cloud.google.com/)
- **SoundCloud** — Create an app at [SoundCloud Developer Portal](https://soundcloud.com/you/apps)

## Architecture

- **Main process** — Electron main process handling IPC, auth flows, API calls, and window management
- **Renderer process** — React frontend with React Router, Tailwind CSS, and Framer Motion
- **Audio analysis** — Web Audio API for real-time visualizer data
- **Storage** — JSON file-based caching and settings (no SQLite)

## License

MIT © ccd-69
