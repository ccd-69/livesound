import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sliders, Zap, Droplets, Waves, Radio } from 'lucide-react';
import { getAudioContext, getFXInsert } from '../audio/engine';
import { createFilter } from '../audio/fx/filter';
import { createDelay } from '../audio/fx/delay';
import { createFlanger } from '../audio/fx/flanger';
import { createReverb } from '../audio/fx/reverb';

type FXType = 'filter' | 'delay' | 'reverb' | 'flanger';

interface FXState {
  active: boolean;
  params: Record<string, number>;
}

const DEFAULTS: Record<FXType, FXState> = {
  filter: { active: false, params: { frequency: 20000, Q: 1, type: 0 } },
  delay: { active: false, params: { delayTime: 0.3, feedback: 0.3, mix: 0.3 } },
  reverb: { active: false, params: { mix: 0.3, decay: 0.8 } },
  flanger: { active: false, params: { rate: 0.5, depth: 3, feedback: 0.4, mix: 0.4 } },
};

export default function FXRack() {
  const [fx, setFx] = useState(DEFAULTS);
  const fxRefs = useRef<Record<FXType, any>>({} as any);
  const chainRef = useRef<{ input: GainNode; output: GainNode } | null>(null);

  const toggleFx = useCallback(
    async (type: FXType) => {
      setFx((prev) => {
        const next = { ...prev, [type]: { ...prev[type], active: !prev[type].active } };
        return next;
      });
    },
    []
  );

  // Build the FX chain: all active FX are chained in series
  useEffect(() => {
    const ctx = getAudioContext();
    const fxInsert = getFXInsert();
    if (!ctx || !fxInsert) return;

    // Tear down old chain
    if (chainRef.current) {
      chainRef.current.input.disconnect();
      chainRef.current.output.disconnect();
      chainRef.current = null;
    }
    (Object.keys(fxRefs.current) as FXType[]).forEach((type) => {
      fxRefs.current[type]?.destroy?.();
      delete fxRefs.current[type];
    });

    const activeTypes = (Object.keys(fx) as FXType[]).filter((t) => fx[t].active);
    if (activeTypes.length === 0) return;

    const chainInput = ctx.createGain();
    const chainOutput = ctx.createGain();
    chainRef.current = { input: chainInput, output: chainOutput };

    let currentNode: AudioNode = chainInput;

    activeTypes.forEach((type) => {
      const state = fx[type];
      let node: any;
      if (type === 'filter') {
        node = createFilter({
          type: state.params.type > 0.5 ? 'highpass' : 'lowpass',
          frequency: state.params.frequency,
          Q: state.params.Q,
        });
      } else if (type === 'delay') {
        node = createDelay({
          delayTime: state.params.delayTime,
          feedback: state.params.feedback,
          mix: state.params.mix,
        });
      } else if (type === 'reverb') {
        createReverb({ mix: state.params.mix, decay: state.params.decay }).then((n) => {
          if (n && fx[type].active) {
            fxRefs.current[type] = n;
            currentNode.connect(n.input);
            n.output.connect(chainOutput);
          }
        });
        return;
      } else if (type === 'flanger') {
        node = createFlanger({
          rate: state.params.rate,
          depth: state.params.depth,
          feedback: state.params.feedback,
          mix: state.params.mix,
        });
      }

      if (node) {
        fxRefs.current[type] = node;
        currentNode.connect(node.input || node.node);
        currentNode = node.output || node.node;
      }
    });

    currentNode.connect(chainOutput);

    // Insert into engine: sources → chainInput → FX chain → chainOutput → fxInsert
    // We can't easily intercept existing source connections, so we route:
    // chainOutput → fxInsert (in parallel with direct source connections)
    // This means FX are applied as a send/return effect on the master bus
    chainOutput.connect(fxInsert);

    return () => {
      chainInput.disconnect();
      chainOutput.disconnect();
      (Object.keys(fxRefs.current) as FXType[]).forEach((type) => {
        fxRefs.current[type]?.destroy?.();
        delete fxRefs.current[type];
      });
    };
  }, [fx]);

  const updateParam = useCallback((type: FXType, key: string, value: number) => {
    setFx((prev) => {
      const next = { ...prev, [type]: { ...prev[type], params: { ...prev[type].params, [key]: value } } };
      const node = fxRefs.current[type];
      if (node) {
        if (type === 'filter') {
          if (key === 'frequency') node.setFrequency(value);
          if (key === 'Q') node.setQ(value);
        } else if (type === 'delay') {
          if (key === 'delayTime') node.setDelayTime(value);
          if (key === 'feedback') node.setFeedback(value);
          if (key === 'mix') node.setMix(value);
        } else if (type === 'reverb') {
          if (key === 'mix') node.setMix(value);
          if (key === 'decay') node.setDecay(value);
        } else if (type === 'flanger') {
          if (key === 'rate') node.setRate(value);
          if (key === 'depth') node.setDepth(value);
          if (key === 'feedback') node.setFeedback(value);
          if (key === 'mix') node.setMix(value);
        }
      }
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        <Sliders size={16} className="text-accent" /> FX Rack
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FXCard
          label="Filter"
          icon={<Zap size={14} />}
          color="text-yellow-400"
          active={fx.filter.active}
          onToggle={() => toggleFx('filter')}
        >
          <Knob label="Freq" value={fx.filter.params.frequency} min={20} max={20000} log onChange={(v) => updateParam('filter', 'frequency', v)} />
          <Knob label="Q" value={fx.filter.params.Q} min={0.1} max={20} onChange={(v) => updateParam('filter', 'Q', v)} />
        </FXCard>

        <FXCard
          label="Delay"
          icon={<Droplets size={14} />}
          color="text-blue-400"
          active={fx.delay.active}
          onToggle={() => toggleFx('delay')}
        >
          <Knob label="Time" value={fx.delay.params.delayTime} min={0.01} max={2} onChange={(v) => updateParam('delay', 'delayTime', v)} />
          <Knob label="FB" value={fx.delay.params.feedback} min={0} max={1} onChange={(v) => updateParam('delay', 'feedback', v)} />
          <Knob label="Mix" value={fx.delay.params.mix} min={0} max={1} onChange={(v) => updateParam('delay', 'mix', v)} />
        </FXCard>

        <FXCard
          label="Reverb"
          icon={<Waves size={14} />}
          color="text-cyan-400"
          active={fx.reverb.active}
          onToggle={() => toggleFx('reverb')}
        >
          <Knob label="Mix" value={fx.reverb.params.mix} min={0} max={1} onChange={(v) => updateParam('reverb', 'mix', v)} />
          <Knob label="Decay" value={fx.reverb.params.decay} min={0.1} max={2} onChange={(v) => updateParam('reverb', 'decay', v)} />
        </FXCard>

        <FXCard
          label="Flanger"
          icon={<Radio size={14} />}
          color="text-purple-400"
          active={fx.flanger.active}
          onToggle={() => toggleFx('flanger')}
        >
          <Knob label="Rate" value={fx.flanger.params.rate} min={0.1} max={10} onChange={(v) => updateParam('flanger', 'rate', v)} />
          <Knob label="Depth" value={fx.flanger.params.depth} min={0} max={10} onChange={(v) => updateParam('flanger', 'depth', v)} />
          <Knob label="Mix" value={fx.flanger.params.mix} min={0} max={1} onChange={(v) => updateParam('flanger', 'mix', v)} />
        </FXCard>
      </div>
    </div>
  );
}

function FXCard({
  label,
  icon,
  color,
  active,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      animate={{ borderColor: active ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)' }}
      className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors ${active ? 'bg-accent/5' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
          {icon} {label}
        </div>
        <button
          onClick={onToggle}
          className={`h-5 w-9 rounded-full transition-colors ${active ? 'bg-accent' : 'bg-hover'}`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
      {active && <div className="flex gap-2">{children}</div>}
    </motion.div>
  );
}

function Knob({
  label,
  value,
  min,
  max,
  log,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  log?: boolean;
  onChange: (v: number) => void;
}) {
  const display = log && max > 1000 ? `${(value / 1000).toFixed(1)}k` : value < 10 ? value.toFixed(2) : value.toFixed(1);

  const toLog = (v: number) => {
    if (!log) return v;
    const minLog = Math.log(min || 1);
    const maxLog = Math.log(max);
    const scale = (Math.log(v) - minLog) / (maxLog - minLog);
    return Math.max(0, Math.min(1, scale));
  };

  const fromLog = (n: number) => {
    if (!log) return min + n * (max - min);
    const minLog = Math.log(min || 1);
    const maxLog = Math.log(max);
    return Math.exp(minLog + n * (maxLog - minLog));
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={toLog(value)}
        onChange={(e) => onChange(fromLog(parseFloat(e.target.value)))}
        className="h-8 w-12 accent-accent"
      />
      <span className="text-[10px] text-muted">{label}</span>
      <span className="text-[10px] text-text">{display}</span>
    </div>
  );
}
