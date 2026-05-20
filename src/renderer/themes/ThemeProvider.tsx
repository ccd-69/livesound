import React, { createContext, useContext, useEffect, useState } from 'react';
import { presets, defaultPreset, type ThemePreset } from './presets';

interface ThemeContextValue {
  preset: ThemePreset;
  setPreset: (name: string) => void;
  customAccent: string;
  setCustomAccent: (color: string) => void;
  presets: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [presetName, setPresetName] = useState(defaultPreset.name);
  const [customAccent, setCustomAccent] = useState('#ffcc00');

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        if (settings?.theme) setPresetName(settings.theme);
        if (settings?.accentColor) setCustomAccent(settings.accentColor);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const preset = presets.find((p) => p.name === presetName) || defaultPreset;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(preset.variables).forEach(([key, val]) => {
      root.style.setProperty(key, key === '--accent-color' && preset.name === 'custom' ? customAccent : val);
    });

    document.body.className = '';
    if (preset.animatedClass) {
      document.body.classList.add(preset.animatedClass);
    }
  }, [preset, customAccent]);

  const setPreset = async (name: string) => {
    setPresetName(name);
    try {
      const settings = await window.electronAPI.getSettings();
      await window.electronAPI.saveSettings({ ...settings, theme: name });
    } catch {
      // ignore
    }
  };

  const handleSetCustomAccent = async (color: string) => {
    setCustomAccent(color);
    try {
      const settings = await window.electronAPI.getSettings();
      await window.electronAPI.saveSettings({ ...settings, accentColor: color });
    } catch {
      // ignore
    }
  };

  return (
    <ThemeContext.Provider
      value={{ preset, setPreset, customAccent, setCustomAccent: handleSetCustomAccent, presets }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
