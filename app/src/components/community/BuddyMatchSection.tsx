import { useState, useEffect, useMemo } from 'react';
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
      <div className="bg-surface-container-low backdrop-blur-md rounded-2xl border border-outline-variant p-6">
        <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[20px] text-error">favorite</span> Find a Buddy
        </h2>
        <p className="text-sm text-on-surface-variant">
          Set your status to "Open to Playdates" or "Looking for Walking Buddies" in your profile to find matches nearby.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low backdrop-blur-md rounded-2xl border border-outline-variant p-6">
      <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[20px] text-error">favorite</span> Find a Buddy
      </h2>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'playdates', 'walking'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 min-h-[44px] text-xs font-medium rounded-full transition-colors ${
              filter === f
                ? 'bg-error text-on-error'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            {f === 'all' ? 'All' : f === 'playdates' ? '🐾 Playdates' : '🚶 Walking'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<span className="material-symbols-outlined text-[40px]">favorite</span>}
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
              <div key={buddy.uid} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-sm font-bold text-on-surface-variant shrink-0">
                  {(buddy.displayName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {buddy.displayName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {statusInfo && (
                      <span className="text-xs text-error">
                        {statusInfo.emoji} {statusInfo.label}
                      </span>
                    )}
                    {hasPetOverlap && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary-container">
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
                  className="px-3 py-1.5 min-h-[44px] text-xs font-medium rounded-lg bg-error text-on-error hover:bg-error/90 disabled:opacity-40 transition-colors"
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
