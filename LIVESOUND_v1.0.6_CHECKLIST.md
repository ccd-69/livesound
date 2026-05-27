# LiveSound v1.0.6 Enhancement Checklist

> Created: 2026-05-27
> Target Version: 1.0.6
> Status: Phase 0 Complete ✓ — Ready for Phase 1

---

## 🎯 How We Work

1. **One item at a time** — complete, test, commit, then move to next
2. **Each item gets its own commit** with a clear message
3. **Update this checklist** after each completion
4. **Ask before starting** if the next item needs clarification

---

## ✅ PHASE 0: Bug Fixes & Refactoring (COMPLETE ✓)

### Bug Fixes
- [x] Fix memory leak in `audioAnalyser.ts` — disconnect `mediaElementSource` on track switch
- [x] Add stream URL refresh logic for YouTube direct streams (6h expiration)
- [x] Add API rate limiting for Spotify/YouTube calls
- [x] Add settings schema version migration
- [x] Fix WebContentsView bounds calculation (use `getContentBounds()`)

### Files Modified
| File | Change |
|------|--------|
| `src/renderer/lib/audioAnalyser.ts` | Added `resetAudioGraph()`, proper cleanup on switch |
| `src/renderer/components/DirectStreamPlayer.tsx` | Auto-refresh stream URLs before 6h expiration, error recovery |
| `src/renderer/components/SpectrumAnalyzerCanvas.tsx` | Cleanup on unmount |
| `src/main/store/settings.ts` | Schema versioning (`__version`) + migration system |
| `src/main/main.ts` | Fixed `getBounds()` → `getContentBounds()` for YTM view |
| `src/main/api/spotify.ts` | Added rate limiting wrappers |
| `src/main/api/youtube.ts` | Added rate limiting wrappers |
| `src/main/lib/rateLimiter.ts` | New: In-memory rate limiter with cleanup |
| `src/main/db/cache.ts` | Updated `saveTracks()` signature to accept optional `playlistId` |

**Build Status:** ✅ All builds pass (`build:main`, `build:preload`, `vite build`)
**Completed:** 2026-05-27

---

## ✅ PHASE 1: Quick Wins (Next)

### 1. Media Session API Integration 🎵
- [x] Show track metadata in OS media controls (Windows volume overlay, macOS Control Center, Linux MPRIS)
- [x] Display album art in system UI
- [x] Wire up play/pause/next/previous/seek from OS controls
- [ ] Test on Windows, macOS, Linux *(requires playing music with auth)*

**Files touched:** `src/renderer/hooks/usePlayback.tsx`
**Status:** ✅ **IMPLEMENTED** — Ready for testing once music plays
**Commit:** `8722dbc`

---

### 2. Discord Rich Presence 🎮
- [x] Show "Listening to LiveSound" in Discord status
- [x] Display current track name, artist, album
- [x] Show elapsed time / duration
- [x] Add toggle in Settings to enable/disable
- [x] Gracefully handle missing client ID or Discord not running

**Files touched:** `src/main/discord/rpc.ts` (new), `src/main/main.ts`, `src/main/preload.ts`, `src/renderer/hooks/usePlayback.tsx`, `src/renderer/pages/Settings.tsx`, `src/renderer/vite-env.d.ts`, `package.json`
**Status:** ✅ **IMPLEMENTED**
**Commit:** `f79f46b`

---

### 3. Mini Player / Picture-in-Picture 🖼️
- [ ] Create compact floating window (300x100 or similar)
- [ ] Always-on-top, frameless, transparent background
- [ ] Basic controls: play/pause, next, prev, close
- [ ] Toggle from main window or global shortcut
- [ ] Sync state with main player

**Files to touch:** `src/main/main.ts`, new `src/main/miniPlayer.ts`, `src/renderer/pages/MiniPlayer.tsx`
**Estimated effort:** 3-4 hours

---

### 4. Lyrics Integration 📝
- [ ] Integrate LRCLIB API for synced lyrics
- [ ] Display lyrics in Now Playing page
- [ ] Auto-scroll / highlight current line
- [ ] Fallback to unsynced lyrics if synced unavailable
- [ ] Cache lyrics locally

**Files to touch:** `src/renderer/pages/NowPlaying.tsx`, new `src/renderer/lib/lyrics.ts`
**Estimated effort:** 3-4 hours

---

## ✅ PHASE 2: Visual Polish (High Impact, Medium Effort)

### 5. Enhanced Audio Visualizations 🌊
- [ ] Circular / radial spectrum analyzer
- [ ] Waveform oscilloscope view
- [ ] 3D particle system reacting to bass (optional)
- [ ] User-selectable visualizer types in settings
- [ ] Smooth transitions between visualizer modes

**Files to touch:** `src/renderer/components/SpectrumAnalyzerCanvas.tsx`, `src/renderer/lib/audioAnalyser.ts`, `src/renderer/pages/Settings.tsx`
**Estimated effort:** 4-6 hours

---

### 6. Listening History & Smart Playlists 🔮
- [ ] Track play history with timestamps
- [ ] "Recently Played" playlist (auto-generated)
- [ ] "Most Played" stats
- [ ] "Discover Weekly" clone using Spotify audio features API
- [ ] Mood-based filtering (danceability, energy, valence)

**Files to touch:** `src/main/db/cache.ts`, `src/renderer/pages/Library.tsx`, `src/renderer/hooks/usePlayback.tsx`
**Estimated effort:** 4-6 hours

---

### 7. Customizable Keyboard Shortcuts ⌨️
- [ ] Settings UI for binding custom shortcuts
- [ ] Store bindings in settings
- [ ] Support global shortcuts (system-wide)
- [ ] Default bindings for common actions
- [ ] Conflict detection

**Files to touch:** `src/main/main.ts`, `src/renderer/pages/Settings.tsx`, `src/main/store/settings.ts`
**Estimated effort:** 3-4 hours

---

## ✅ PHASE 3: Deep Features (High Impact, High Effort)

### 8. Parametric Equalizer 🎚️
- [ ] 10-band parametric EQ using Web Audio API BiquadFilterNode
- [ ] Preset EQ profiles (Rock, Jazz, Classical, Electronic, etc.)
- [ ] Custom profile save/load
- [ ] Real-time spectrum display alongside EQ
- [ ] AutoEQ integration (optional — import headphone profiles)

**Files to touch:** New `src/renderer/components/Equalizer.tsx`, `src/renderer/lib/audioAnalyser.ts`, `src/renderer/pages/Settings.tsx`
**Estimated effort:** 6-8 hours

---

### 9. Gapless Playback ⏭️
- [ ] Preload next track into secondary audio buffer
- [ ] Crossfade between tracks (configurable duration)
- [ ] Handle format changes between tracks
- [ ] Album gapless detection

**Files to touch:** `src/renderer/hooks/usePlayback.tsx`, `src/renderer/lib/audioAnalyser.ts`
**Estimated effort:** 4-6 hours

---

### 10. Spotify Web Playback SDK Integration 🎧
- [ ] Embed Spotify Web Playback SDK for in-app streaming
- [ ] Replace device-control playback with direct stream
- [ ] Gain audio stream access for visualizer
- [ ] Handle SDK authentication
- [ ] Fallback to device control if SDK unavailable

**Files to touch:** `src/main/auth/spotify.ts`, `src/renderer/hooks/usePlayback.tsx`, `src/renderer/components/SpotifyPlayer.tsx`
**Estimated effort:** 6-10 hours

---

## 📋 Current Status

| Phase | Progress |
|-------|----------|
| Phase 0: Bug Fixes | ✅ **COMPLETE** |
| Phase 1: Quick Wins | 🔄 **Ready to start** |
| Phase 2: Visual Polish | 🔄 Not started |
| Phase 3: Deep Features | 🔄 Not started |

**Last updated:** 2026-05-27

---

## 🚀 Next Steps

**Phase 0 is done!** All builds pass. Foundation is solid.

**Recommended next:** Start with **Media Session API** (Phase 1, Item 1) — it's the highest impact quick win that makes LiveSound feel like a real desktop music player.

Ready when you are! 🎉
