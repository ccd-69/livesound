let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let captureStarted = false;
let currentSampleRate = 48000;
let silenceNode: GainNode | null = null;
let mediaStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let mediaElementSource: MediaElementAudioSourceNode | null = null;
let connectedAudioEl: HTMLAudioElement | null = null;

function ensureAudioGraph(sr: number) {
  if (audioCtx && analyser) return;

  audioCtx = new AudioContext({ sampleRate: sr });
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0.8;

  silenceNode = audioCtx.createGain();
  silenceNode.gain.value = 0;
  silenceNode.connect(audioCtx.destination);
}

/**
 * Reset the audio graph completely.
 * Call this when switching between different audio sources to prevent
 * memory leaks and DOMException from reusing MediaElementAudioSourceNodes.
 */
function resetAudioGraph() {
  if (mediaElementSource) {
    try { mediaElementSource.disconnect(); } catch { /* ignore */ }
    mediaElementSource = null;
    connectedAudioEl = null;
  }
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch { /* ignore */ }
    sourceNode = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (analyser) {
    try { analyser.disconnect(); } catch { /* ignore */ }
    analyser = null;
  }
  if (silenceNode) {
    try { silenceNode.disconnect(); } catch { /* ignore */ }
    silenceNode = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  captureStarted = false;
}

/**
 * Connect an HTMLAudioElement directly to the analyser.
 * This is the best approach for direct-stream mode — no screen share dialog,
 * clean audio data, and instant connection.
 */
export function connectAudioElement(audioEl: HTMLAudioElement): boolean {
  // Already connected to this exact element
  if (captureStarted && connectedAudioEl === audioEl) {
    return true;
  }

  try {
    // If switching to a different element, fully reset the audio graph.
    // createMediaElementSource() can only be called once per HTMLMediaElement,
    // and trying to create another source for the same element throws DOMException.
    if (connectedAudioEl && connectedAudioEl !== audioEl) {
      resetAudioGraph();
    }

    currentSampleRate = 48000;
    ensureAudioGraph(currentSampleRate);

    if (!audioCtx || !analyser) return false;

    // If no mediaElementSource exists yet, create one for this element
    if (!mediaElementSource || connectedAudioEl !== audioEl) {
      mediaElementSource = audioCtx.createMediaElementSource(audioEl);
      connectedAudioEl = audioEl;
    }

    mediaElementSource.connect(analyser);
    analyser.connect(silenceNode!);

    audioCtx.resume().catch(() => {});
    captureStarted = true;
    console.log('[AudioAnalyser] Connected audio element');
    return true;
  } catch (err) {
    console.error('[AudioAnalyser] Failed to connect audio element:', err);
    return false;
  }
}

/**
 * Fallback: capture system audio via getDisplayMedia.
 * Used for iframe/Spotify modes where we can't access the audio element.
 */
export async function startAudioCapture(): Promise<boolean> {
  if (captureStarted && mediaStream) return true;

  try {
    // If an audio element was previously connected, fully reset the graph
    // so we can route display media audio through the analyser instead.
    if (mediaElementSource || connectedAudioEl) {
      resetAudioGraph();
    }

    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });

    mediaStream.getVideoTracks().forEach((track) => track.stop());

    const audioTrack = mediaStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.error('[AudioAnalyser] No audio track in display media stream');
      return false;
    }

    currentSampleRate = 48000;
    ensureAudioGraph(currentSampleRate);

    if (!audioCtx || !analyser) return false;

    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    sourceNode.connect(analyser);
    analyser.connect(silenceNode!);

    await audioCtx.resume();
    captureStarted = true;
    console.log('[AudioAnalyser] Display audio capture started');
    return true;
  } catch (err) {
    console.error('[AudioAnalyser] Capture failed:', err);
    return false;
  }
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

export function getSampleRate(): number {
  return currentSampleRate;
}

/**
 * Completely stop and clean up all audio capture resources.
 * Call this when switching tracks, changing modes, or unmounting components.
 */
export function stopAudioCapture() {
  resetAudioGraph();
}
