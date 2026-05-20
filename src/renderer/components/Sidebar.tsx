import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import ThemePicker from './ThemePicker';

const navItems = [
  { to: '/', label: 'Library', icon: '🎵' },
  { to: '/search', label: 'Search', icon: '🔍' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const [showThemes, setShowThemes] = useState(false);

  return (
    <aside
      style={{
        background: 'var(--card-color)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        gap: '0.5rem',
        height: '100%',
      }}
    >
      <div style={{ fontSize: '1.25rem', fontWeight: 700, padding: '0.5rem 0 1rem', color: 'var(--accent-color)' }}>
        LiveSound
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              padding: '0.6rem 0.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? 'var(--accent-color)' : 'var(--text-color)',
              background: isActive ? 'var(--hover-color)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background 0.2s',
            })}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={() => setShowThemes(!showThemes)}
        style={{
          padding: '0.6rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          background: 'transparent',
          color: 'var(--text-color)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        🎨 Themes
      </button>

      {showThemes && <ThemePicker />}
    </aside>
  );
}
