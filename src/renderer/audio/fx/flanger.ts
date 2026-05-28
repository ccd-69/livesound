/**
 * Flanger effect: short delay line modulated by an LFO.
 */
import { getAudioContext } from '../engine';

export interface FlangerParams {
  rate: number;     // LFO frequency in Hz (0.1 to 10)
  depth: number;    // Modulation depth in ms (0 to 10)
  feedback: number; // 0 to 1
  mix: number;      // 0 = dry, 1 = wet
}

export function createFlanger(params: FlangerParams) {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const input = ctx.createGain();
  const output = ctx.createGain();

  // LFO oscillates delay time
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = params.rate;

  const lfoGain = ctx.createGain();
  // depth is in ms, convert to seconds for the delay param
  lfoGain.gain.value = (params.depth / 1000) / 2;

  // Base delay offset (short, ~1-10ms)
  const baseDelay = 0.005; // 5ms

  const delay = ctx.createDelay(0.1);
  delay.delayTime.value = baseDelay;

  // LFO modulates delayTime around baseDelay
  // delay.delayTime = baseDelay + lfo * depth
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = params.feedback;

  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - params.mix;

  const wetGain = ctx.createGain();
  wetGain.gain.value = params.mix;

  // input ─┬─→ dryGain ───────────────┐
  //        └─→ delay ──→ wetGain ────┤
  //                 ↑←── feedback ←──┘
  input.connect(dryGain);
  dryGain.connect(output);

  input.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(output);
  delay.connect(feedbackGain);
  feedbackGain.connect(delay);

  return {
    input,
    output,
    setRate(v: number) {
      lfo.frequency.setTargetAtTime(v, ctx.currentTime, 0.02);
    },
    setDepth(v: number) {
      lfoGain.gain.setTargetAtTime((v / 1000) / 2, ctx.currentTime, 0.02);
    },
    setFeedback(v: number) {
      feedbackGain.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    },
    setMix(v: number) {
      const clamped = Math.max(0, Math.min(1, v));
      dryGain.gain.setTargetAtTime(1 - clamped, ctx.currentTime, 0.02);
      wetGain.gain.setTargetAtTime(clamped, ctx.currentTime, 0.02);
    },
    destroy() {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      input.disconnect();
      output.disconnect();
      delay.disconnect();
      feedbackGain.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
    },
  };
}
