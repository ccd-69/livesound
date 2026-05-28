# LiveSound v1.0.7 — DJ / FX / Beat Matching Plan

## Goal
Transform LiveSound from a media player into a hybrid DJ app with real-time FX, beat detection, and dual-deck mixing.

---

## Deep Dive Summary

### Best-In-Class Tools Found

| Tool | Purpose | Why Use It |
|------|---------|------------|
| **Essentia.js** (`mtg/essentia.js`) | BPM/beat/key detection | C++ algorithms compiled to WASM. Provides `RhythmExtractor2013`, `BeatTrackerDegara`, `PercivalBpmEstimator`. Runs in AudioWorklet for real-time. |
| **SoundTouchJS AudioWorklet** (`cutterbl/SoundTouchJS`) | Pitch-preserving time stretch | The *only* production JS solution for true pitch preservation when changing tempo. Native `playbackRate` changes both pitch AND speed. |
| **realtime-bpm-analyzer** (`dlepaux/realtime-bpm-analyzer`) | Lightweight real-time BPM | Pure AudioWorklet JS, zero deps. Easier to integrate than Essentia if we only need BPM, not key/timbre. |
| **Pizzicato.js** (`alemangui/pizzicato`) | FX chain abstraction | Wraps Web Audio nodes into `.addEffect()` API. Has Flanger, Delay, Reverb, Convolver built-in. |
| **audiojs/beat-detection** | Spectral flux onset detection | Pure JS reference implementation. Good for understanding the math or offline analysis. |
| **virtual-audio-graph** (`benji6/virtual-audio-graph`) | Declarative audio graphs | Functional API for managing complex node connections. Alternative to imperative `connect()` spaghetti. |

### Reference Implementations
- **[mixi](https://github.com/fabriziosalmi/mixi)** — Full Rust/WASM + AudioWorklet DAW/DJ engine. Adaptive spectral-flux BPM + Goertzel chromagram key detection. Best reference for architecture.
- **[martins-software-i-dj](https://github.com/iagomartins/martins-software-i-dj)** — Electron + React + TypeScript + AudioWorklet/Wasm. Dual-deck, SYNC, 3-band EQ, crossfader, pitch ±100%.
- **[mini-dj](https://github.com/Wincha/mini-dj)** — Browser-based dual-deck. Equal-power crossfader, auto-gain, VU meters, tap BPM.
- **[wam](https://github.com/danbovey/wam)** — Auto-mixing library with WAAClock scheduling, beat detection, and tempo-matching crossfades.

### Critical Technical Insight
The Web Audio API's native `playbackRate` and `detune` **do NOT preserve pitch**. They change both speed and pitch simultaneously. For beat-matched DJ mixing, you need **SoundTouchJS** (or a WASM port of RubberBand) to change tempo without changing pitch.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          LiveSound Renderer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Deck A    │  │   Deck B    │  │   FX Rack   │  │   Mixer    │ │
│  │  (playing)  │  │  (cued/     │  │ (per-deck   │  │(crossfader,│ │
│  │             │  │   loading)  │  │  + master)  │  │  3-band EQ)│ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │               │        │
│         └────────────────┴────────────────┘               │        │
│                          │                                │        │
│                   ┌──────▼──────┐                  ┌──────▼──────┐ │
│                   │ AudioContext│                  │   Master    │ │
│                   │  .destination│◄─────────────────│   Output    │ │
│                   └─────────────┘                  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
         ▲
         │ MediaElementAudioSourceNode (bridges <audio> element)
         │
    ┌────┴────┐
    │ <audio> │  ← existing playback element
    └─────────┘
```

---

## Phases

### Phase 0: Audio Bridge (Foundation)
**Goal:** Route all existing playback through the Web Audio API so we can add FX and analysis.

**Checklist:**
- [ ] Create a singleton `AudioEngine` class in `src/renderer/audio/engine.ts`
- [ ] Initialize `AudioContext` on first user interaction (browser autoplay policy)
- [ ] Bridge existing `<audio>` elements via `MediaElementAudioSourceNode`
- [ ] Add a master `GainNode` for global volume control
- [ ] Add a master `DynamicsCompressorNode` to prevent clipping when FX are active
- [ ] Add `AnalyserNode` for the existing visualizer (replace or augment current approach)
- [ ] Ensure audio context suspends/resumes correctly with app focus/blur
- [ ] Graceful fallback: if Web Audio API is unavailable, fall back to direct `<audio>` playback

**Why first:** Without this bridge, the existing playback system is completely separate from the Web Audio graph. You cannot add FX, analyzers, or mixers to an `<audio>` element directly.

---

### Phase 1: FX Knobs (Per-Deck Effects)
**Goal:** Add real-time audio effects with UI knobs for each deck.

**Checklist:**
- [ ] **Low-Pass / High-Pass Filter** — `BiquadFilterNode` with `frequency` and `Q` params
  - [ ] UI: Dual-concentric knob or slider for cutoff + resonance
  - [ ] Map to `AudioParam` for smooth, glitch-free changes
- [ ] **Delay / Echo** — `DelayNode` with feedback loop (`GainNode` → back into delay)
  - [ ] UI: Time, Feedback, Mix (dry/wet) knobs
- [ ] **Reverb** — `ConvolverNode` with impulse response (IR) files
  - [ ] Ship 3 IR presets: Room, Hall, Cathedral
  - [ ] UI: Size (pre-delay), Damping, Mix knobs
- [ ] **Flanger** — Custom graph: `DelayNode` + `OscillatorNode` (LFO) modulating delayTime + feedback
  - [ ] UI: Rate, Depth, Feedback, Mix knobs
- [ ] **Master FX Send/Return** — Allow FX to be applied globally vs per-deck
- [ ] **FX Rack UI** — React component with animated knobs (use `motion/react` for smooth value transitions)
- [ ] Preset system: Save/load FX chains (e.g., "Deep Reverb", "Lo-Fi Echo")

**Libraries to use:**
- Native Web Audio API nodes (no dependencies for basic FX)
- **Pizzicato.js** as an optional abstraction layer if node wiring gets complex
- **virtual-audio-graph** if we want declarative FX chain definitions

---

### Phase 2: Beat Detection & BPM Analysis
**Goal:** Detect tempo and beat positions in real-time for any playing track.

**Checklist:**
- [ ] Add per-deck `AnalyserNode` (FFT size 2048 or 4096) for frequency analysis
- [ ] **Option A (Recommended):** Integrate `realtime-bpm-analyzer`
  - [ ] Load its AudioWorklet processor inline or from file
  - [ ] Connect to deck's audio source
  - [ ] Emit `bpm` and `bpmStable` events to the UI
- [ ] **Option B (Advanced):** Integrate `Essentia.js` WASM in AudioWorklet
  - [ ] Load `essentia-wasm.web.wasm` inside the worklet
  - [ ] Run `OnsetDetection` + `PercivalBpmEstimator` on 128-sample blocks
  - [ ] More accurate but heavier; good for offline analysis of loaded tracks
- [ ] **Option C (Hybrid):** Use `audiojs/beat-detection` for offline analysis when a track loads, then `realtime-bpm-analyzer` for live confirmation
- [ ] Display BPM in the Now Playing / Deck UI
- [ ] Beat grid overlay on waveform visualization (if waveforms are implemented)
- [ ] Tap-to-BPM fallback button for manual override
- [ ] Store detected BPM in track metadata (local cache) so re-analysis isn't needed

**Key decision:** `realtime-bpm-analyzer` is pure JS, zero deps, and designed specifically for this. Start with it. Upgrade to Essentia.js if accuracy isn't sufficient.

---

### Phase 3: Tempo Control & Pitch Preservation
**Goal:** Change playback speed without changing pitch, enabling beat-matched mixing.

**Checklist:**
- [ ] Integrate **SoundTouchJS AudioWorklet** (`@soundtouchjs/audio-worklet`)
  - [ ] Install: `npm install @soundtouchjs/audio-worklet`
  - [ ] Create `SoundTouchNode` in the audio graph after `MediaElementAudioSourceNode`
  - [ ] Expose `tempo`, `pitch`, `rate` AudioParams
- [ ] **Pitch Fader UI** — Slider from -50% to +50% (DJ standard is ±8%, ±16%, ±50%)
  - [ ] Snap-to-zero behavior near center
  - [ ] Display current BPM based on original BPM × tempo
- [ ] **Key Lock / Master Tempo** — Toggle to preserve pitch while changing tempo
  - [ ] When ON: adjust `tempo` param, `pitch` compensates automatically
  - [ ] When OFF: adjust `playbackRate` directly (pitch changes with speed — vinyl mode)
- [ ] **Pitch Bend buttons** — Momentary ±nudge for manual beat alignment
- [ ] **BPM Sync button** — Automatically calculate required tempo to match another deck's BPM
  - [ ] Formula: `targetTempo = deckB.bpm / deckA.bpm`
  - [ ] Ramp tempo over 1-2 seconds for smooth transition

**Why SoundTouchJS:** The native Web Audio API `playbackRate` changes pitch AND speed. SoundTouchJS is the only production JavaScript library that decouples them using the SoundTouch time-stretching algorithm.

---

### Phase 4: Dual Deck System
**Goal:** Two independent playback decks that can be mixed together.

**Checklist:**
- [ ] **Deck State Management** — Refactor playback into `DeckA` and `DeckB` classes
  - [ ] Each deck has its own audio source, FX chain, gain, and analyzer
  - [ ] Only one deck plays to speakers at a time (or both via mixer)
  - [ ] "Load to Deck A / Deck B" buttons in search results and playlists
- [ ] **Crossfader** — `GainNode` pair with equal-power curve (`sin²θ + cos²θ = 1`)
  - [ ] UI: Horizontal slider with center detent
  - [ ] Smooth `AudioParam` ramping (exponentialRampToValueAtTime)
- [ ] **3-Band EQ per deck** — Three `BiquadFilterNode`s (low, mid, high)
  - [ ] UI: Vertical sliders (-∞ to +6dB) with kill switches (click to -∞)
- [ ] **Headphone Cue** — Route one deck to a separate output (if multi-channel audio interface available)
  - [ ] Otherwise, mute the cued deck in the main mix while keeping it audible in a "preview" mode
- [ ] **VU Meters per deck + master** — Use `AnalyserNode.getByteFrequencyData()` for level visualization
- [ ] **Deck transport controls** — Play/Pause, Cue (return to start), Jump ±1 beat, Loop 1/2/4/8 beats

**Architecture change:** The existing `usePlayback` hook assumes a single active track. We'll need a `useDJEngine` hook that manages two decks, a mixer, and FX state.

---

### Phase 5: Advanced DJ Features (Post-v1.0.7)
**Goal:** Professional-grade DJ functionality.

**Checklist:**
- [ ] **Auto-Mix mode** — Like `wam`: automatically crossfade between tracks based on energy/BPM
- [ ] **Looping** — Set loop in/out points, beat-quantized loops (1, 2, 4, 8, 16 beats)
- [ ] **Hot Cues** — 8 color-coded cue points per track, jump instantly
- [ ] **Beat Jump** — Jump forward/backward by N beats
- [ ] **Scratch simulation** — Touch-responsive waveform scrubbing (requires AudioWorklet for sample-accurate seeking)
- [ ] **Waveform display** — Pre-rendered waveform + live playback head (use `offlineAudioContext` to generate waveform data)
- [ ] **Key detection & harmonic mixing** — Use Essentia.js `Goertzel` chromagram for Camelot key notation
- [ ] **MIDI controller support** — Map external DJ controllers (Pioneer DDJ, Numark, etc.) via Web MIDI API
- [ ] **Recording** — `MediaRecorder` API to capture the master output to WAV/MP3

---

## Recommended Tech Stack per Phase

| Phase | Primary Libraries | Notes |
|-------|-------------------|-------|
| 0 (Bridge) | Native Web Audio API | `MediaElementAudioSourceNode`, `AudioContext`, `GainNode` |
| 1 (FX) | Native nodes + optional Pizzicato.js | Keep it native for performance; Pizzicato as sugar |
| 2 (BPM) | `realtime-bpm-analyzer` | Start here. Swap for Essentia.js if needed later |
| 3 (Tempo) | `@soundtouchjs/audio-worklet` | Critical for pitch preservation |
| 4 (Decks) | Native nodes | Equal-power crossfader math is trivial in JS |
| 5 (Pro) | Essentia.js + Web MIDI API | Only if we go deep into harmonic mixing + controllers |

---

## File Structure Plan

```
src/
  renderer/
    audio/
      engine.ts          # AudioContext singleton, master chain
      deck.ts            # Single deck: source → FX → gain → mixer
      mixer.ts           # Crossfader, EQ, master gain
      fx/
        filter.ts        # BiquadFilter wrapper
        delay.ts         # DelayNode + feedback
        reverb.ts        # ConvolverNode + IR loader
        flanger.ts       # LFO-modulated delay
      analysis/
        bpm.ts           # realtime-bpm-analyzer integration
        waveform.ts      # AnalyserNode data for VU meters
      timeStretch/
        soundtouch.ts    # SoundTouchJS AudioWorklet wrapper
    components/
      DJDeck.tsx         # Single deck UI: waveform, transport, pitch
      DJMixer.tsx        # Crossfader, EQ, master controls
      FXRack.tsx         # Knobs for active FX
      BPMDisplay.tsx     # Animated BPM readout
      PitchFader.tsx     # Vertical tempo slider
    hooks/
      useDJEngine.tsx    # Replaces usePlayback for dual-deck mode
      useBPM.tsx         # BPM detection hook
      useFX.tsx          # FX chain state hook
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| **Safari/Chrome `AudioContext` autoplay policy** | Initialize context on first user click. Suspend when app hidden. |
| **SoundTouchJS AudioWorklet buffer starvation** | Keep source `playbackRate` slightly above target tempo to feed the stretcher faster than it consumes. |
| **Performance with two decks + FX + analysis** | Run heavy DSP (FFT, time-stretch) in AudioWorklets, not main thread. Limit FFT size to 2048. |
| **Memory leaks from AudioNodes** | Explicitly `disconnect()` and `null` all nodes when unloading a track. Use a single persistent graph, swap buffers. |
| **Impulse response files for reverb** | Ship 3 small IR files (~100KB each). Load once at app startup. |
| **Existing single-track playback breaks** | Phase 0 must be a transparent bridge. Old `Audio()` playback still works; Web Audio API is an optional overlay. |

---

## Immediate Next Step

**Start Phase 0: Audio Bridge.**

Create `src/renderer/audio/engine.ts` that:
1. Lazily creates an `AudioContext` on first playback
2. Creates a `MediaElementAudioSourceNode` from the existing `<audio>` element
3. Routes it through a master `GainNode` to `destination`
4. Exposes `setVolume()`, `suspend()`, and `resume()` methods

Once the bridge is working, all existing playback continues normally, but we now have a hook into the Web Audio graph for adding FX in Phase 1.

---

*Sources:*
- [Essentia.js](https://github.com/mtg/essentia.js/) — WASM audio analysis library
- [SoundTouchJS AudioWorklet](https://github.com/cutterbl/SoundTouchJS) — Pitch-preserving time stretch
- [realtime-bpm-analyzer](https://github.com/dlepaux/realtime-bpm-analyzer) — AudioWorklet-native BPM detection
- [Pizzicato.js](https://github.com/alemangui/pizzicato) — Web Audio FX abstraction
- [audiojs/beat-detection](https://github.com/audiojs/beat-detection) — Spectral flux onset detection
- [mixi](https://github.com/fabriziosalmi/mixi) — Rust/WASM DAW/DJ reference
- [martins-software-i-dj](https://github.com/iagomartins/martins-software-i-dj) — Electron DJ reference
- [mini-dj](https://github.com/Wincha/mini-dj) — Browser dual-deck reference
- [wam](https://github.com/danbovey/wam) — Auto-mixing library
