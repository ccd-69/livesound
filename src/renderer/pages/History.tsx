import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Music,
  TrendingUp,
  User,
  Trash2,
  Calendar,
  BarChart3,
  Disc3,
} from 'lucide-react';

type TimeFilter = 'all' | 'today' | 'week';

interface HistoryEvent {
  id: string;
  trackId: string;
  name: string;
  artist: string;
  album?: string;
  image?: string;
  source: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function isInFilter(event: HistoryEvent, filter: TimeFilter): boolean {
  if (filter === 'all') return true;
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (filter === 'today') return event.startedAt >= startOfToday;
  if (filter === 'week') return event.startedAt >= now - 7 * 24 * 60 * 60 * 1000;
  return true;
}

export default function History() {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.loadHistory();
      setHistory(data.reverse()); // newest first
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const filtered = useMemo(() => history.filter((e) => isInFilter(e, filter)), [history, filter]);

  const stats = useMemo(() => {
    const totalMs = filtered.reduce((sum, e) => sum + (e.durationMs || 0), 0);
    const uniqueTracks = new Set(filtered.map((e) => e.trackId)).size;

    const topTrackMap = new Map<string, { name: string; artist: string; image?: string; duration: number; count: number }>();
    const topArtistMap = new Map<string, { name: string; duration: number; count: number }>();

    for (const e of filtered) {
      const t = topTrackMap.get(e.trackId) || { name: e.name, artist: e.artist, image: e.image, duration: 0, count: 0 };
      t.duration += e.durationMs || 0;
      t.count++;
      topTrackMap.set(e.trackId, t);

      const a = topArtistMap.get(e.artist) || { name: e.artist, duration: 0, count: 0 };
      a.duration += e.durationMs || 0;
      a.count++;
      topArtistMap.set(e.artist, a);
    }

    const topTrack = Array.from(topTrackMap.values()).sort((a, b) => b.duration - a.duration)[0];
    const topArtist = Array.from(topArtistMap.values()).sort((a, b) => b.duration - a.duration)[0];

    return { totalMs, uniqueTracks, topTrack, topArtist, totalPlays: filtered.length };
  }, [filtered]);

  const clear = async () => {
    if (!confirm('Clear all listening history? This cannot be undone.')) return;
    await window.electronAPI.clearHistory();
    setHistory([]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-accent">Listening History</h2>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={clear}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-hover"
        >
          <Trash2 size={14} /> Clear History
        </motion.button>
      </div>

      {/* Time filters */}
      <div className="mb-4 flex gap-2">
        {[
          { key: 'all' as TimeFilter, label: 'All Time', icon: <BarChart3 size={14} /> },
          { key: 'today' as TimeFilter, label: 'Today', icon: <Calendar size={14} /> },
          { key: 'week' as TimeFilter, label: 'This Week', icon: <Clock size={14} /> },
        ].map((f) => (
          <motion.button
            key={f.key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? 'border-accent bg-accent text-black'
                : 'border-border bg-transparent text-text hover:bg-hover'
            }`}
          >
            {f.icon}
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Clock size={18} />}
          label="Total Time"
          value={formatDuration(stats.totalMs)}
        />
        <StatCard
          icon={<Music size={18} />}
          label="Tracks Played"
          value={stats.totalPlays.toString()}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Top Track"
          value={stats.topTrack ? `${stats.topTrack.name}` : '—'}
          sub={stats.topTrack ? formatDuration(stats.topTrack.duration) : undefined}
        />
        <StatCard
          icon={<User size={18} />}
          label="Top Artist"
          value={stats.topArtist ? stats.topArtist.name : '—'}
          sub={stats.topArtist ? formatDuration(stats.topArtist.duration) : undefined}
        />
      </div>

      {/* Recently played */}
      <h3 className="mb-3 text-sm font-semibold text-muted uppercase">Recently Played</h3>

      {loading && <p className="text-sm text-muted">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted">
          <Disc3 size={40} strokeWidth={1} />
          <p className="text-sm">No listening history yet. Play some tracks to see them here.</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {filtered.slice(0, 100).map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.2 }}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-hover"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-hover">
              {e.image ? (
                <img src={e.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted">
                  <Music size={16} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{e.name}</div>
              <div className="truncate text-xs text-muted">{e.artist}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs tabular-nums text-muted">
                {e.durationMs ? formatDuration(e.durationMs) : '—'}
              </div>
              <div className="text-[10px] tabular-nums text-muted/60">
                {new Date(e.startedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lg"
    >
      <div className="mb-2 flex items-center gap-2 text-accent">
        {icon}
        <span className="text-xs font-medium uppercase text-muted">{label}</span>
      </div>
      <div className="truncate text-lg font-bold text-text">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </motion.div>
  );
}
