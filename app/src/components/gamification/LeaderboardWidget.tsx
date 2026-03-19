import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarUrl: string;
  totalPoints: number;
  level: number;
}

interface LeaderboardWidgetProps {
  currentUid: string;
}

export default function LeaderboardWidget({ currentUid }: LeaderboardWidgetProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const q = query(
          collection(db, 'leaderboard'),
          orderBy('totalPoints', 'desc'),
          limit(10),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setEntries(snap.docs.map((d) => d.data() as LeaderboardEntry));
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">leaderboard</span>
        <h3 className="text-lg font-semibold text-on-surface">Leaderboard</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-on-surface-variant">
            progress_activity
          </span>
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-on-surface-variant">
          No leaderboard data yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isMe = entry.uid === currentUid;
            return (
              <li
                key={entry.uid}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                  isMe
                    ? 'bg-primary-container/40 ring-1 ring-primary/30'
                    : 'hover:bg-surface-container-highest'
                }`}
              >
                {/* Rank */}
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    rank <= 3
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {rank}
                </span>

                {/* Avatar */}
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">person</span>
                  </span>
                )}

                {/* Name */}
                <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                  {entry.displayName}
                  {isMe && (
                    <span className="ml-1 text-xs text-primary">(you)</span>
                  )}
                </span>

                {/* Points */}
                <span className="shrink-0 text-sm font-medium text-on-surface-variant">
                  {entry.totalPoints.toLocaleString()} pts
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
