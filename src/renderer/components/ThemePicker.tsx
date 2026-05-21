import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../themes/ThemeProvider';

export default function ThemePicker() {
  const { preset, setPreset, customAccent, setCustomAccent, presets } = useTheme();

  return (
    <div className="mt-2 max-h-[200px] overflow-y-auto rounded-lg border border-border bg-hover p-3">
      <div className="mb-2 text-xs font-semibold text-muted">Select Theme</div>
      <div className="flex flex-col gap-1">
        {presets.map((p) => (
          <motion.button
            key={p.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPreset(p.name)}
            className={`rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors ${
              preset.name === p.name
                ? 'bg-accent text-black'
                : 'bg-transparent text-text hover:bg-hover'
            }`}
          >
            {p.label}
          </motion.button>
        ))}
      </div>
      {preset.name === 'custom' && (
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs">Accent:</label>
          <input
            type="color"
            value={customAccent}
            onChange={(e) => setCustomAccent(e.target.value)}
            className="h-7 w-10 cursor-pointer border-none bg-transparent"
          />
        </div>
      )}
    </div>
  );
}
