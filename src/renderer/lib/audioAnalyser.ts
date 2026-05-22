let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let workletNode: AudioWorkletNode | null = null;
let captureStarted = false;
let currentSampleRate = 48000;
let unsubscribeAudioData: (() => void) | null = null;
let silenceNode: GainNode | null = null;

function getCaptureApi() {
  return window.electronAPI?.processAudioCapture ?? null;
}

const WORKLET_CODE = `
class PcmFeed extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.readIdx = 0;
    this.current = null;
    this.port.onmessage = (e) => {
      this.queue.push(e.data);
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const len = out[0].length;
    for (let i = 0; i < len; i++) {
      if (!this.current || this.readIdx >= this.current.length) {
        this.current = this.queue.shift();
        this.readIdx = 0;
      }
      const v = this.current ? this.current[this.readIdx++] : 0;
      for (let c = 0; c < out.length; c++) out[c][i] = v;
    }
    return true;
  }
}
registerProcessor('pcm-feed', PcmFeed);
`;

export async function startAudioCapture(): Promise<boolean> {
  if (captureStarted) return true;
  const api = getCaptureApi();
  if (!api) return false;

  try {
    const supported = await api.isPlatformSupported();
    if (!supported) return false;

    // Use renderer PID instead of browser PID — audio plays in renderer process
    const pid = await window.electronAPI.getRendererPid?.();
    if (!pid) {
      console.error('[AudioAnalyser] No renderer PID available');
      return false;
    }

    const ok = await api.startCapture(pid);
    if (!ok) return false;

    captureStarted = true;

    unsubscribeAudioData = api.on('audio-data', (audioData: any) => {
      if (!audioData?.buffer) return;
      currentSampleRate = audioData.sampleRate || 48000;
      ensureAudioGraph(currentSampleRate);
      feedPcm(audioData.buffer, audioData.channels || 1);
    });

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

  // Sink audio to a zero-gain node so the graph processes without
  // routing captured audio back to the speakers (feedback loop).
  silenceNode = audioCtx.createGain();
  silenceNode.gain.value = 0;
  silenceNode.connect(audioCtx.destination);

  const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  audioCtx.audioWorklet.addModule(url).then(() => {
    workletNode = new AudioWorkletNode(audioCtx!, 'pcm-feed');
    workletNode.connect(analyser!);
    analyser!.connect(silenceNode!);
    URL.revokeObjectURL(url);

    // Resume context — browsers start it suspended until user interaction
    audioCtx!.resume().catch(() => {});
  });
}

function feedPcm(interleaved: Float32Array, channels: number) {
  if (!workletNode) return;
  const mono = new Float32Array(Math.floor(interleaved.length / channels));
  for (let i = 0; i < mono.length; i++) {
    mono[i] = interleaved[i * channels];
  }
  workletNode.port.postMessage(mono);
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

export function getSampleRate(): number {
  return currentSampleRate;
}

export function stopAudioCapture() {
  const api = getCaptureApi();
  if (unsubscribeAudioData) {
    unsubscribeAudioData();
    unsubscribeAudioData = null;
  }
  if (api) {
    api.stopCapture();
  }
  if (workletNode) {
    workletNode.disconnect();
    workletNode = null;
  }
  if (analyser) {
    analyser.disconnect();
    analyser = null;
  }
  if (silenceNode) {
    silenceNode.disconnect();
    silenceNode = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
  captureStarted = false;
}
