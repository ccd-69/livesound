import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCw, X, Loader2 } from 'lucide-react';

export default function UpdateBanner() {
  const [status, setStatus] = useState<{
    status: string;
    version?: string;
    error?: string;
    progress?: number;
  }>({
    status: 'idle',
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    window.electronAPI.getUpdateStatus().then(setStatus);
    const unsub = window.electronAPI.onUpdateStatus((payload) => {
      setStatus(payload);
      setDismissed(false);
    });
    return () => unsub();
  }, []);

  const visible =
    !dismissed &&
    (status.status === 'available' ||
      status.status === 'downloading' ||
      status.status === 'downloaded');

  async function handleDownload() {
    await window.electronAPI.downloadUpdate();
  }

  function handleInstall() {
    window.electronAPI.installUpdate();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25 }}
          className="col-span-full row-start-1 z-50 flex flex-col gap-2 bg-accent px-4 py-2 text-black"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {status.status === 'available' && (
                <>
                  <Download size={16} />
                  <span>Update v{status.version} is available.</span>
                </>
              )}
              {status.status === 'downloading' && (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Downloading update v{status.version}...</span>
                </>
              )}
              {status.status === 'downloaded' && (
                <>
                  <RefreshCw size={16} />
                  <span>Update v{status.version} is ready to install.</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {status.status === 'available' && (
                <button
                  onClick={handleDownload}
                  className="rounded-md bg-black/20 px-3 py-1 text-xs font-semibold text-black hover:bg-black/30 transition-colors"
                >
                  Download & Install
                </button>
              )}
              {status.status === 'downloaded' && (
                <button
                  onClick={handleInstall}
                  className="rounded-md bg-black/20 px-3 py-1 text-xs font-semibold text-black hover:bg-black/30 transition-colors"
                >
                  Install & Restart
                </button>
              )}
              <button
                onClick={() => setDismissed(true)}
                className="rounded-md p-1 text-black/70 hover:text-black hover:bg-black/10 transition-colors"
                title="Later"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          {status.status === 'downloading' && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-black/40 transition-all"
                  style={{ width: `${status.progress || 0}%` }}
                />
              </div>
              <span className="min-w-[36px] text-right text-xs font-semibold tabular-nums">
                {(status.progress || 0).toFixed(0)}%
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
