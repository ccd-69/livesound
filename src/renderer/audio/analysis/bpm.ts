import { getAudioContext, getAnalyser } from '../engine';

let analyzerInstance: any = null;
let bpmCallback: ((bpm: number) => void) | null = null;

export async function startBPMDetection(onBPM: (bpm: number) => void) {
  stopBPMDetection();

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const { createRealtimeBpmAnalyzer } = await import('realtime-bpm-analyzer');
    const analyzer = await createRealtimeBpmAnalyzer(ctx);
    analyzerInstance = analyzer;
    bpmCallback = onBPM;

    analyzer.on('bpm', (data: any) => {
      const tempo = data?.bpm?.[0]?.tempo;
      if (tempo && bpmCallback) {
        bpmCallback(tempo);
      }
    });

    // Connect to the master analyser node so we analyze the mixed output
    const masterAnalyser = getAnalyser();
    if (masterAnalyser) {
      masterAnalyser.connect(analyzer.node);
    }

    console.log('[BPM] Started detection');
  } catch (err) {
    console.error('[BPM] Failed to start:', err);
  }
}

export function stopBPMDetection() {
  if (analyzerInstance) {
    try {
      analyzerInstance.node?.disconnect();
    } catch { /* ignore */ }
    analyzerInstance = null;
  }
  bpmCallback = null;
  console.log('[BPM] Stopped detection');
}

export function isBPMActive(): boolean {
  return !!analyzerInstance;
}
