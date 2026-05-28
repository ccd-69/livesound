/**
 * Low-pass / High-pass filter using BiquadFilterNode.
 */
import { getAudioContext } from '../engine';

export interface FilterParams {
  type: 'lowpass' | 'highpass';
  frequency: number; // Hz
  Q: number;       // 0.0001 to 1000
}

export function createFilter(params: FilterParams) {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const node = ctx.createBiquadFilter();
  node.type = params.type;
  node.frequency.value = params.frequency;
  node.Q.value = params.Q;

  return {
    node,
    setFrequency(v: number) {
      node.frequency.setTargetAtTime(v, ctx.currentTime, 0.02);
    },
    setQ(v: number) {
      node.Q.setTargetAtTime(v, ctx.currentTime, 0.02);
    },
    setType(t: 'lowpass' | 'highpass') {
      node.type = t;
    },
    destroy() {
      node.disconnect();
    },
  };
}
