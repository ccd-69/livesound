import { Client } from 'discord-rpc';
import { loadSettings } from '../store/settings.js';

let rpc: Client | null = null;
let connected = false;

function getClientId(): string | null {
  const settings = loadSettings();
  return settings.discordClientId || null;
}

export function isConnected(): boolean {
  return connected;
}

export async function connect(): Promise<void> {
  if (rpc || connected) return;

  const clientId = getClientId();
  if (!clientId) {
    console.log('[DiscordRPC] No client ID configured. Set discordClientId in settings.');
    return;
  }

  rpc = new Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    connected = true;
    console.log('[DiscordRPC] Connected');
  });

  rpc.on('disconnected', () => {
    connected = false;
    rpc = null;
    console.log('[DiscordRPC] Disconnected');
  });

  try {
    await rpc.login({ clientId });
  } catch (err) {
    console.log('[DiscordRPC] Connection failed (Discord may not be running):', (err as Error).message);
    rpc = null;
  }
}

export function disconnect(): void {
  if (rpc) {
    rpc.destroy().catch(() => {});
    rpc = null;
    connected = false;
  }
}

export async function setActivity(activity: {
  details?: string;
  state?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  buttons?: { label: string; url: string }[];
}): Promise<void> {
  if (!rpc || !connected) return;

  try {
    await rpc.setActivity({
      ...activity,
      instance: false,
    });
  } catch (err) {
    console.log('[DiscordRPC] setActivity failed:', (err as Error).message);
  }
}

export async function clearActivity(): Promise<void> {
  if (!rpc || !connected) return;

  try {
    await rpc.clearActivity();
  } catch (err) {
    console.log('[DiscordRPC] clearActivity failed:', (err as Error).message);
  }
}
