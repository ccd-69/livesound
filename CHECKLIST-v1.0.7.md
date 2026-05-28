# LiveSound v1.0.7 — DJ / FX / Beat Matching Checklist

**Checkpoint:** `checkpoint-v1.0.7-start`  
**Goal:** Transform LiveSound into a hybrid DJ app with real-time FX, beat detection, and dual-deck mixing.

---

## Phase 0: Audio Bridge 🔄
> Route existing `<audio>` playback through the Web Audio API graph so we can add FX and analysis.

- [ ] **0.1 Create AudioEngine singleton** — `src/renderer/audio/engine.ts`
  - Lazily create `AudioContext` on first playback
  - Bridge existing `<audio>` elements via `MediaElementAudioSourceNode`
  - Route through master `GainNode` to `destination`
  - Expose `setVolume()`, `suspend()`, `resume()`
- [ ] **0.2 Integrate with existing playback** — Hook into `usePlayback.tsx`
  - Create `MediaElementAudioSourceNode` when a track starts playing
  - Ensure audio context resumes correctly on user interaction (autoplay policy)
- [ ] **0.3 Add master compressor** — Prevent clipping when FX are active
  - `DynamicsCompressorNode` before `destination`
- [ ] **0.4 Add AnalyserNode for visualizer** — Feed existing visualizer from the audio graph
  - Replace or augment current visualizer approach
- [ ] **0.5 Lifecycle management** — Suspend/resume on app focus/blur
  - `visibilitychange` listener to suspend context when hidden
- [ ] **0.6 Graceful fallback** — If Web Audio API unavailable, fall back to direct `<audio>` playback
- [ ] **0.7 Test** — Verify all existing playback still works (Spotify, YouTube, SoundCloud)

**Phase 0 Complete Criteria:** All existing tracks play normally, but audio now flows through the Web Audio graph. No regressions in any source.

---

## Phase 1: FX Knobs
> Add real-time audio effects with UI knobs for each deck.

- [ ] **1.1 Filter (LP/HP)** — `BiquadFilterNode` with `frequency` and `Q` params
- [ ] **1.2 Delay / Echo** — `DelayNode` with feedback loop
- [ ] **1.3 Reverb** — `ConvolverNode` with impulse response files (Room, Hall, Cathedral)
- [ ] **1.4 Flanger** — Custom graph: `DelayNode` + `OscillatorNode` (LFO) modulating delayTime
- [ ] **1.5 FX Rack UI** — React component with animated knobs
- [ ] **1.6 Preset system** — Save/load FX chains

---

## Phase 2: Beat Detection
> Detect tempo and beat positions in real-time for any playing track.

- [ ] **2.1 Integrate `realtime-bpm-analyzer`** — AudioWorklet processor for live BPM
- [ ] **2.2 Display BPM** — Show in Now Playing / Deck UI
- [ ] **2.3 Beat grid overlay** — On waveform visualization
- [ ] **2.4 Tap-to-BPM fallback** — Manual override button
- [ ] **2.5 Cache detected BPM** — Store in local cache per track

---

## Phase 3: Tempo Control
> Change playback speed without changing pitch, enabling beat-matched mixing.

- [ ] **3.1 Integrate SoundTouchJS AudioWorklet** — Pitch-preserving time stretch
- [ ] **3.2 Pitch Fader UI** — Slider from -50% to +50%
- [ ] **3.3 Key Lock / Master Tempo** — Toggle pitch preservation
- [ ] **3.4 Pitch Bend buttons** — Momentary nudge for manual beat alignment
- [ ] **3.5 BPM Sync button** — Auto-calculate tempo to match other deck

---

## Phase 4: Dual Deck Mixer
> Two independent playback decks that can be mixed together.

- [ ] **4.1 Deck State Management** — `DeckA` and `DeckB` classes
- [ ] **4.2 Crossfader** — Equal-power curve (`sin²θ + cos²θ = 1`)
- [ ] **4.3 3-Band EQ per deck** — Low, mid, high with kill switches
- [ ] **4.4 Headphone Cue** — Route one deck to separate output / preview mode
- [ ] **4.5 VU Meters** — Per deck + master
- [ ] **4.6 Deck transport controls** — Play/Pause, Cue, Jump ±1 beat, Loop

---

## Phase 5: Pro DJ Features
> Professional-grade DJ functionality.

- [ ] **5.1 Auto-Mix mode** — Automatically crossfade based on energy/BPM
- [ ] **5.2 Looping** — Beat-quantized loops (1, 2, 4, 8, 16 beats)
- [ ] **5.3 Hot Cues** — 8 color-coded cue points per track
- [ ] **5.4 Beat Jump** — Jump forward/backward by N beats
- [ ] **5.5 Waveform display** — Pre-rendered waveform + live playback head
- [ ] **5.6 Key detection & harmonic mixing** — Essentia.js `Goertzel` chromagram
- [ ] **5.7 MIDI controller support** — Web MIDI API
- [ ] **5.8 Recording** — `MediaRecorder` API to capture master output

---

## In Progress
- **Phase 2** — Beat Detection

## Completed
- [x] Checkpoint tag created: `checkpoint-v1.0.7-start`
- [x] Checklist file created
- [x] Phase 0 — Audio Bridge (engine, playback integration, visualizer, lifecycle)
- [x] Phase 1 — FX Knobs (Filter, Delay, Reverb, Flanger + FX Rack UI)
