import { useState, useEffect, useMemo } from 'react';
import { Heart, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocial, type PublicProfile } from '../../contexts/SocialContext';
import { usePets } from '../../contexts/PetContext';
import EmptyState from '../ui/EmptyState';

const STATUS_LABELS: Record<string, { emoji: string; label: string }> = {
  'Open to Playdates': { emoji: '🐾', label: 'Open to Playdates' },
  'Looking for Walking Buddies': { emoji: '🚶', label: 'Walking Buddy' },
};

export default function BuddyMatchSection() {
  const { user, profile } = useAuth();
  const { searchUsers, sendFriendRequest } = useSocial();
  const { pets } = usePets();
  const [buddies, setBuddies] = useState<PublicProfile[]>([]);
  const [filter, setFilter] = useState<'all' | 'playdates' | 'walking'>('all');
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    // Search for users with active public statuses
    searchUsers('').then(results => {
      setBuddies(results.filter(u =>
        u.uid !== user.uid &&
        u.publicStatus !== 'None' &&
        u.visibility !== 'Private'
      ));
    });
  }, [user, searchUsers]);

  const filtered = useMemo(() => {
    if (filter === 'all') return buddies;
    const status = filter === 'playdates' ? 'Open to Playdates' : 'Looking for Walking Buddies';
    return buddies.filter(b => b.publicStatus === status);
  }, [buddies, filter]);

  const userPetTypes = useMemo(
    () => new Set(pets.map(p => p.type?.toLowerCase() ?? 'dog')),
    [pets]
  );

  if (!profile?.publicStatus || profile.publicStatus === 'None') {
    return (
      <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 p-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-rose-500" /> Find a Buddy
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Set your status to "Open to Playdates" or "Looking for Walking Buddies" in your profile to find matches nearby.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 p-6">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-rose-500" /> Find a Buddy
      </h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'playdates', 'walking'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filter === f
                ? 'bg-rose-500 text-white'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
            }`}
          >
            {f === 'all' ? 'All' : f === 'playdates' ? '🐾 Playdates' : '🚶 Walking'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-10 h-10" />}
          title="No buddies found yet"
          description="Check back later as more pet parents join your area!"
        />
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 8).map(buddy => {
            const statusInfo = STATUS_LABELS[buddy.publicStatus ?? ''];
            const hasPetOverlap = buddy.pets?.some(p =>
              userPetTypes.has(p.type?.toLowerCase() ?? '')
            );
            return (
              <div key={buddy.uid} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-700/30">
                <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-sm font-bold text-stone-600 dark:text-stone-300 shrink-0">
                  {(buddy.displayName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                    {buddy.displayName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {statusInfo && (
                      <span className="text-xs text-rose-600 dark:text-rose-400">
                        {statusInfo.emoji} {statusInfo.label}
                      </span>
                    )}
                    {hasPetOverlap && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        Similar pets
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    sendFriendRequest(buddy.uid).catch(() => {});
                    setSentRequests(prev => new Set([...prev, buddy.uid]));
                  }}
                  disabled={sentRequests.has(buddy.uid) || (profile?.friends ?? []).includes(buddy.uid)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 transition-colors"
                >
                  {(profile?.friends ?? []).includes(buddy.uid) ? 'Friends' : sentRequests.has(buddy.uid) ? 'Sent' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
