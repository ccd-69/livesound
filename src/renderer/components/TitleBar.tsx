import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Minus, Square, Maximize2, X } from 'lucide-react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.electronAPI.isWindowMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
    const interval = setInterval(checkMaximized, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex h-8 items-center justify-between border-b border-border glass pl-3 select-none"
      style={{ WebkitAppRegion: 'drag' as any }}
      onDoubleClick={() => window.electronAPI.maximizeWindow()}
    >
      <span className="text-xs font-semibold tracking-wider text-muted"
        style={{ WebkitAppRegion: 'drag' as any }}
      >
        LiveSound
      </span>

      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' as any }}>
        <WindowButton
          onClick={() => window.electronAPI.minimizeWindow()}
          icon={<Minus size={14} />}
          hoverClass="hover:bg-hover"
          title="Minimize"
        />
        <WindowButton
          onClick={() => window.electronAPI.maximizeWindow()}
          icon={isMaximized ? <Maximize2 size={14} /> : <Square size={12} />}
          hoverClass="hover:bg-hover"
          title={isMaximized ? 'Restore' : 'Maximize'}
        />
        <WindowButton
          onClick={() => window.electronAPI.closeWindow()}
          icon={<X size={14} />}
          hoverClass="hover:bg-red-600 hover:text-white"
          title="Close"
        />
      </div>
    </div>
  );
}

function WindowButton({
  onClick,
  icon,
  hoverClass,
  title,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  hoverClass: string;
  title: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={title}
      className={`flex h-8 w-[46px] items-center justify-center rounded-none bg-transparent text-text transition-colors ${hoverClass}`}
    >
      {icon}
    </motion.button>
  );
}
