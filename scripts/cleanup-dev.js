import { execSync } from 'child_process';
import process from 'process';
import os from 'os';

/**
 * Cross-platform dev process cleanup script.
 * Kills stale Electron, Vite, and Node dev server processes
 * so `npm run dev` always starts from a clean slate.
 *
 * Skips the current process and its ancestors to avoid
 * killing the `npm run dev` command that spawned this script.
 */

const platform = os.platform();

// Build a set of PIDs to protect (ourselves and ancestors)
const protectedPids = new Set();
function buildProtectedPids() {
  let pid = process.pid;
  protectedPids.add(String(pid));
  if (process.ppid) {
    protectedPids.add(String(process.ppid));
  }

  if (platform === 'win32') {
    try {
      const out = execSync('wmic process get ProcessId,ParentProcessId /format:csv', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = out.trim().split('\r\n').filter((l) => l.includes(','));
      // Build a pid -> ppid map
      const pidToPpid = new Map();
      for (const line of lines) {
        const parts = line.split(',');
        const child = parts[2]?.trim();
        const parent = parts[3]?.trim();
        if (child && parent) pidToPpid.set(child, parent);
      }
      // Walk up the tree from our PID
      let current = String(process.pid);
      for (let i = 0; i < 20; i++) {
        const parent = pidToPpid.get(current);
        if (!parent) break;
        protectedPids.add(parent);
        current = parent;
      }
    } catch {}
  }
}
buildProtectedPids();

function shouldKill(pid) {
  return !protectedPids.has(String(pid));
}

function killByPort(port) {
  try {
    if (platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = out.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        if (!shouldKill(pid)) continue;
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[cleanup] Killed PID ${pid} on port ${port}`);
        } catch {}
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
      console.log(`[cleanup] Killed processes on port ${port}`);
    }
  } catch {
    // no processes on port
  }
}

function killByName(name) {
  try {
    if (platform === 'win32') {
      const out = execSync(`tasklist /FI "IMAGENAME eq ${name}.exe" /FO CSV /NH`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = out.trim().split('\n');
      for (const line of lines) {
        const cols = line.replace(/"/g, '').split(',');
        const pid = cols[1]?.trim();
        if (pid && /^\d+$/.test(pid) && shouldKill(pid)) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[cleanup] Killed ${name} PID ${pid}`);
          } catch {}
        }
      }
    } else {
      execSync(`pkill -9 -f "${name}" 2>/dev/null || true`, { stdio: 'ignore' });
      console.log(`[cleanup] Killed ${name}`);
    }
  } catch {
    // no matching processes
  }
}

function killSmallNodeProcesses() {
  if (platform !== 'win32') return;
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const lines = out.trim().split('\n');
    for (const line of lines) {
      const cols = line.replace(/"/g, '').split(',');
      const pid = cols[1]?.trim();
      const mem = cols[4]?.trim() || '';
      const memKB = parseInt(mem.replace(/\D/g, ''), 10) || 0;
      if (
        pid &&
        /^\d+$/.test(pid) &&
        shouldKill(pid) &&
        memKB < 150_000
      ) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[cleanup] Killed node.exe PID ${pid} (${Math.round(memKB / 1024)} MB)`);
        } catch {}
      }
    }
  } catch {}
}

console.log('[cleanup] Cleaning up stale dev processes...');

// Kill by port (Vite dev server)
for (const port of [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180]) {
  killByPort(port);
}

// Kill Electron and small node processes
if (platform === 'win32') {
  killByName('electron');
  killSmallNodeProcesses();
} else {
  killByName('electron');
  killByName('node');
}

console.log('[cleanup] Done.');
process.exit(0);
