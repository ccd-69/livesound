/**
 * Convolution reverb using impulse responses.
 * Ships with 3 presets: Room, Hall, Cathedral.
 */
import { getAudioContext } from '../engine';

export interface ReverbParams {
  mix: number;     // 0 = dry, 1 = wet
  decay: number;   // simulated decay factor (applied to wet gain)
}

const IR_PRESETS: Record<string, string> = {
  room: '/ir/room.wav',
  hall: '/ir/hall.wav',
  cathedral: '/ir/cathedral.wav',
};

let irCache: Record<string, AudioBuffer> = {};

async function loadIR(ctx: AudioContext, name: string): Promise<AudioBuffer | null> {
  if (irCache[name]) return irCache[name];
  const url = IR_PRESETS[name];
  if (!url) return null;
  try {
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    irCache[name] = buf;
    return buf;
  } catch {
    return null;
  }
}

export async function createReverb(params: ReverbParams, presetName = 'room') {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const input = ctx.createGain();
  const output = ctx.createGain();

  const convolver = ctx.createConvolver();
  convolver.normalize = true;

  const ir = await loadIR(ctx, presetName);
  if (ir) {
    convolver.buffer = ir;
  }

  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - params.mix;

  const wetGain = ctx.createGain();
  wetGain.gain.value = params.mix * params.decay;

  input.connect(dryGain);
  dryGain.connect(output);

  input.connect(convolver);
  convolver.connect(wetGain);
  wetGain.connect(output);

  return {
    input,
    output,
    setMix(v: number) {
      const clamped = Math.max(0, Math.min(1, v));
      dryGain.gain.setTargetAtTime(1 - clamped, ctx.currentTime, 0.02);
      wetGain.gain.setTargetAtTime(clamped * params.decay, ctx.currentTime, 0.02);
    },
    setDecay(v: number) {
      wetGain.gain.setTargetAtTime(params.mix * v, ctx.currentTime, 0.02);
    },
    async loadPreset(name: string) {
      const newIr = await loadIR(ctx, name);
      if (newIr) convolver.buffer = newIr;
    },
    destroy() {
      input.disconnect();
      output.disconnect();
      convolver.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
    },
  };
}
