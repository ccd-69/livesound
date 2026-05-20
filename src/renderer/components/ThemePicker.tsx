import React from 'react';
import { useTheme } from '../themes/ThemeProvider';

export default function ThemePicker() {
  const { preset, setPreset, customAccent, setCustomAccent, presets } = useTheme();

  return (
    <div
      style={{
        marginTop: '0.5rem',
        padding: '0.75rem',
        background: 'var(--hover-color)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        maxHeight: '200px',
        overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
        Select Theme
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {presets.map((p) => (
          <button
            key={p.name}
            onClick={() => setPreset(p.name)}
            style={{
              padding: '0.4rem 0.5rem',
              borderRadius: '6px',
              border: 'none',
              background: preset.name === p.name ? 'var(--accent-color)' : 'transparent',
              color: preset.name === p.name ? '#000' : 'var(--text-color)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.8rem',
              fontWeight: preset.name === p.name ? 600 : 400,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset.name === 'custom' && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem' }}>Accent:</label>
          <input
            type="color"
            value={customAccent}
            onChange={(e) => setCustomAccent(e.target.value)}
            style={{ width: '40px', height: '28px', cursor: 'pointer', border: 'none', background: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
