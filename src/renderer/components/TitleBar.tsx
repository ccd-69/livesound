import React, { useState, useEffect } from 'react';

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

  const btnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-color)',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '46px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0',
    transition: 'background 0.2s',
    WebkitAppRegion: 'no-drag',
  };

  return (
    <div
      style={{
        height: '32px',
        background: 'var(--card-color)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0 0 12px',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      }}
      onDoubleClick={() => window.electronAPI.maximizeWindow()}
    >
      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.5px',
          WebkitAppRegion: 'drag',
        }}
      >
        LiveSound
      </span>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          style={btnStyle}
          onClick={() => window.electronAPI.minimizeWindow()}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-color)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Minimize"
        >
          ─
        </button>
        <button
          style={btnStyle}
          onClick={() => window.electronAPI.maximizeWindow()}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-color)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? '❐' : '□'}
        </button>
        <button
          style={{
            ...btnStyle,
            fontSize: '1.1rem',
          }}
          onClick={() => window.electronAPI.closeWindow()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e81123';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-color)';
          }}
          title="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
