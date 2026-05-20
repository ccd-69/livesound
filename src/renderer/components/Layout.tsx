import React from 'react';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import TitleBar from './TitleBar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        gridTemplateRows: 'auto 1fr auto',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-color)',
        color: 'var(--text-color)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ gridColumn: '1 / -1', gridRow: '1' }}>
        <TitleBar />
      </div>
      <div style={{ gridColumn: '1', gridRow: '2', height: '100%', overflow: 'hidden' }}>
        <Sidebar />
      </div>
      <main
        style={{
          gridColumn: '2',
          gridRow: '2',
          overflow: 'auto',
          padding: '1.5rem',
        }}
      >
        <Outlet />
      </main>
      <div style={{ gridColumn: '1 / -1', gridRow: '3' }}>
        <PlayerBar />
      </div>
    </div>
  );
}
