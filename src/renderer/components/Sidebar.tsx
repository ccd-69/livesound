import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Library, Search, Settings, Palette, Clock, Disc } from 'lucide-react';
import ThemePicker from './ThemePicker';

const navItems = [
  { to: '/', label: 'Library', icon: Library },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/now-playing', label: 'Now Playing', icon: Disc },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const [showThemes, setShowThemes] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-full flex-col glass p-4 gap-1">
      <div className="px-2 pb-4 pt-1 text-lg font-bold tracking-tight text-accent">
        LiveSound
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <motion.div
              key={item.to}
              whileHover={{ x: 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-accent'
                      : 'text-text hover:bg-hover'
                  }`
                }
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-hover"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  <Icon size={18} />
                </span>
                <span className="relative z-10">{item.label}</span>
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      <button
        onClick={() => setShowThemes(!showThemes)}
        className="flex items-center gap-3 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm text-text transition-colors hover:bg-hover"
      >
        <Palette size={18} />
        Themes
      </button>

      <AnimatePresence>
        {showThemes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ThemePicker />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
