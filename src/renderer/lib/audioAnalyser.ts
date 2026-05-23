let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let captureStarted = false;
let currentSampleRate = 48000;
let silenceNode: GainNode | null = null;
let mediaStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;

export async function startAudioCapture(): Promise<boolean> {
  if (captureStarted) return true;

  try {
    // Use getDisplayMedia via Electron's setDisplayMediaRequestHandler.
    // The main process provides a screen source with audio:'loopback',
    // which captures system audio without the legacy getUserMedia crash.
    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });

    // We only need the audio track for the visualizer.
    // Stop all video tracks immediately to avoid screen-recording UX side effects.
    mediaStream.getVideoTracks().forEach((track) => track.stop());

    const audioTrack = mediaStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.error('[AudioAnalyser] No audio track in display media stream');
      return false;
    }

    currentSampleRate = 48000;
    ensureAudioGraph(currentSampleRate);

    if (!audioCtx || !analyser) {
      return false;
    }

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

function ensureAudioGraph(sr: number) {
  if (audioCtx && analyser) return;

  audioCtx = new AudioContext({ sampleRate: sr });
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 16384;
  analyser.smoothingTimeConstant = 0.8;

  silenceNode = audioCtx.createGain();
  silenceNode.gain.value = 0;
  silenceNode.connect(audioCtx.destination);
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

export function getSampleRate(): number {
  return currentSampleRate;
}

export function stopAudioCapture() {
  if (sourceNode) {
    try {
      sourceNode.disconnect();
    } catch {
      // ignore
    }
    sourceNode = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (analyser) {
    try {
      analyser.disconnect();
    } catch {
      // ignore
    }
    analyser = null;
  }
  if (silenceNode) {
    try {
      silenceNode.disconnect();
    } catch {
      // ignore
    }
    silenceNode = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  captureStarted = false;
}
