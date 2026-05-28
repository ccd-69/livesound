/**
 * Delay / Echo effect with feedback and wet/dry mix.
 */
import { getAudioContext } from '../engine';

export interface DelayParams {
  delayTime: number; // seconds (0.001 to 5)
  feedback: number;  // 0 to 1
  mix: number;       // 0 = dry, 1 = wet
}

export function createDelay(params: DelayParams) {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const input = ctx.createGain();
  const output = ctx.createGain();

  const delayNode = ctx.createDelay(5);
  delayNode.delayTime.value = params.delayTime;

  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = params.feedback;

  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - params.mix;

  const wetGain = ctx.createGain();
  wetGain.gain.value = params.mix;

  // Routing:
  // input ─┬─→ dryGain ─────────────────────┐
  //        └─→ delayNode ──→ wetGain ─────┤
  //                 ↑←── feedbackGain ←────┘
  input.connect(dryGain);
  dryGain.connect(output);

  input.connect(delayNode);
  delayNode.connect(wetGain);
  wetGain.connect(output);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);

  return {
    input,
    output,
    setDelayTime(v: number) {
      delayNode.delayTime.setTargetAtTime(v, ctx.currentTime, 0.02);
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
      input.disconnect();
      output.disconnect();
      delayNode.disconnect();
      feedbackGain.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
    },
  };
}
