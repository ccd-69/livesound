import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'motion/react';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import TitleBar from './TitleBar';
import UpdateBanner from './UpdateBanner';
import YouTubeAudioPlayer from './YouTubeAudioPlayer';
import AutoTestPlayer from './AutoTestPlayer';

export default function Layout() {
  return (
    <div className="grid h-screen w-screen overflow-hidden bg-bg text-text"
      style={{
        gridTemplateColumns: '240px 1fr',
        gridTemplateRows: 'auto auto 1fr auto',
      }}
    >
      <div className="col-span-full row-start-1">
        <TitleBar />
      </div>
      <div className="col-span-full row-start-2 z-50">
        <UpdateBanner />
      </div>

      <aside className="row-start-3 h-full overflow-hidden border-r border-border">
        <Sidebar />
      </aside>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="row-start-3 overflow-auto p-6"
      >
        <Outlet />
      </motion.main>

      <div className="col-span-full row-start-4 border-t border-border">
        <PlayerBar />
      </div>

      {/* Hidden YouTube audio player so audio plays regardless of route */}
      <YouTubeAudioPlayer />
    </div>
  );
}
