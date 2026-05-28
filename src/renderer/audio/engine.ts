let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let analyser: AnalyserNode | null = null;
let destination: AudioDestinationNode | null = null;

// Track which audio elements we've already created MediaElementAudioSourceNodes for.
// createMediaElementSource() can only be called once per element.
const elementSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

// Currently connected source nodes
const connectedSources = new Set<AudioNode>();

function createGraph(): boolean {
  if (audioCtx) return true;
  try {
    audioCtx = new AudioContext({ sampleRate: 48000 });
    destination = audioCtx.destination;

    // Master analyser for visualizer — placed after FX, before destination
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;

    // Master compressor to prevent clipping when FX are active
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Master gain for global volume
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;

    // Chain: masterGain → compressor → analyser → destination
    masterGain.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(destination);

    console.log('[AudioEngine] Graph created');
    return true;
  } catch (err) {
    console.error('[AudioEngine] Failed to create AudioContext:', err);
    return false;
  }
}

/**
 * Lazily initialize the AudioContext on first use.
 * Must be called after a user gesture to satisfy autoplay policy.
 */
export async function initEngine(): Promise<boolean> {
  if (audioCtx?.state === 'running') return true;
  const ok = createGraph();
  if (!ok || !audioCtx) return false;
  try {
    await audioCtx.resume();
    return true;
  } catch {
    return false;
  }
}

/**
 * Bridge an HTMLAudioElement into the Web Audio graph.
 * Returns the MediaElementAudioSourceNode so the caller can also connect to it.
 */
export function bridgeAudioElement(audioEl: HTMLAudioElement): MediaElementAudioSourceNode | null {
  if (!createGraph() || !audioCtx || !masterGain) return null;

  let source = elementSources.get(audioEl);
  if (!source) {
    try {
      source = audioCtx.createMediaElementSource(audioEl);
      elementSources.set(audioEl, source);
    } catch (err) {
      console.error('[AudioEngine] Failed to create MediaElementSource:', err);
      return null;
    }
  }

  if (!connectedSources.has(source)) {
    source.connect(masterGain);
    connectedSources.add(source);
    console.log('[AudioEngine] Bridged audio element');
  }

  audioCtx.resume().catch(() => {});
  return source;
}

/**
 * Disconnect an audio element from the graph.
 */
export function unbridgeAudioElement(audioEl: HTMLAudioElement): void {
  const source = elementSources.get(audioEl);
  if (source && connectedSources.has(source)) {
    try { source.disconnect(masterGain!); } catch { /* ignore */ }
    connectedSources.delete(source);
  }
}

/**
 * Set master volume (0–1).
 */
export function setMasterVolume(value: number): void {
  if (!masterGain || !audioCtx) return;
  const clamped = Math.max(0, Math.min(1, value));
  masterGain.gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.02);
}

/**
 * Get current master volume.
 */
export function getMasterVolume(): number {
  return masterGain?.gain.value ?? 1;
}

/**
 * Get the AnalyserNode for the visualizer.
 */
export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

/**
 * Get the sample rate of the AudioContext.
 */
export function getSampleRate(): number {
  return audioCtx?.sampleRate ?? 48000;
}

/**
 * Get the AudioContext (for creating additional nodes).
 */
export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

/**
 * Suspend the audio context (app hidden / background).
 */
export async function suspend(): Promise<void> {
  if (audioCtx?.state === 'running') {
    await audioCtx.suspend();
  }
}

/**
 * Resume the audio context (app visible / foreground).
 */
export async function resume(): Promise<void> {
  if (audioCtx?.state === 'suspended') {
    await audioCtx.resume();
  }
}

/**
 * Check if the engine is ready.
 */
export function isReady(): boolean {
  return audioCtx?.state === 'running';
}

/**
 * Tear down the entire engine. Call on app quit or when switching away
 * from DJ mode back to normal playback.
 */
export function destroy(): void {
  connectedSources.forEach((node) => {
    try { node.disconnect(); } catch { /* ignore */ }
  });
  connectedSources.clear();

  try { masterGain?.disconnect(); } catch { /* ignore */ }
  try { compressor?.disconnect(); } catch { /* ignore */ }
  try { analyser?.disconnect(); } catch { /* ignore */ }

  masterGain = null;
  compressor = null;
  analyser = null;
  destination = null;

  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  console.log('[AudioEngine] Destroyed');
}
