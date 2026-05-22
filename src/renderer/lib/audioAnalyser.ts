let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let isStarting = false;
let videoEl: HTMLVideoElement | null = null;

export async function startAudioCapture(): Promise<boolean> {
  if (analyser) return true;
  if (isStarting) return false;
  isStarting = true;

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });

    // Keep the stream alive with a hidden video element
    videoEl = document.createElement('video');
    videoEl.srcObject = stream;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.style.position = 'fixed';
    videoEl.style.opacity = '0';
    videoEl.style.pointerEvents = 'none';
    videoEl.style.width = '1px';
    videoEl.style.height = '1px';
    videoEl.style.zIndex = '-1';
    document.body.appendChild(videoEl);

    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    return true;
  } catch (err) {
    console.error('[AudioAnalyser] Capture failed:', err);
    return false;
  } finally {
    isStarting = false;
  }
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

export function stopAudioCapture() {
  if (videoEl) {
    videoEl.pause();
    if (videoEl.srcObject) {
      (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    videoEl.remove();
    videoEl = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
}
