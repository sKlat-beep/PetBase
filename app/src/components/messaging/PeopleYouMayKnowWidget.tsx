import { useState } from 'react';
import { UserPlus, X, Check } from 'lucide-react';
import { useSocial } from '../../contexts/SocialContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import type { UserProfile } from '../../types/user';

function countMutualFriends(
  candidateFriends: string[],
  currentUserFriends: string[],
): number {
  const currentSet = new Set(currentUserFriends);
  return candidateFriends.filter(f => currentSet.has(f)).length;
}

/** Build the subtitle shown under a PYMK suggestion name. */
function buildSubtitle(mutualFriends: number, sharedGroups: number, petLabel: string): string {
  const parts: string[] = [];
  if (mutualFriends > 0) {
    parts.push(mutualFriends === 1 ? '1 mutual friend' : `${mutualFriends} mutual friends`);
  }
  if (sharedGroups > 0) {
    parts.push(sharedGroups === 1 ? '1 group in common' : `${sharedGroups} groups in common`);
  }
  if (parts.length > 0) return parts.join(' · ');
  if (petLabel) return petLabel;
  return '';
}

export function PeopleYouMayKnowWidget() {
  const { directory, sendFriendRequest, sentRequests } = useSocial();
  const { groups } = useCommunity();
  const { profile, user, updateProfile } = useAuth() as {
    profile: (UserProfile & { friends?: string[] }) | null;
    user: { uid: string } | null;
    updateProfile: (u: Partial<UserProfile>) => Promise<void>;
  };
  const { pets } = usePets() as any;
  const [pendingSent, setPendingSent] = useState<Set<string>>(new Set());

  const friends = new Set(profile?.friends ?? []);
  const dismissed = new Set(profile?.dismissedSuggestions ?? []);
  const blocked = new Set((profile as any)?.blockedUsers ?? []);
  const uid = user?.uid ?? '';

  // Build joined groups: CommunityGroup[] filtered by membership
  const joinedGroups = groups.filter(g => g.members?.[uid]);

  const myFriends = Array.from(friends);

  // Score candidates
  const candidates = directory
    .filter(u => {
      const id = u.uid;
      return id && id !== uid && !friends.has(id) && !dismissed.has(id) && !blocked.has(id);
    })
    .map(u => {
      const id = u.uid;
      let score = 0;

      // Mutual friends: +3 per mutual friend (weighted higher than groups)
      const mutualFriends = countMutualFriends(u.friends ?? [], myFriends);
      score += mutualFriends * 3;

      // Shared groups: +2 per group
      let sharedGroups = 0;
      for (const g of joinedGroups) {
        if (g.members?.[id]) {
          sharedGroups += 1;
          score += 2;
        }
      }

      // Shared pet type: +1 (first match only)
      const myPetTypes = new Set((pets ?? []).map((p: any) => p.type ?? p.species ?? p.kind ?? '').filter(Boolean));
      const theirPetTypes: string[] = (u.pets ?? []).map((p: any) => p.type ?? p.species ?? p.type ?? '');
      let petLabel = '';
      for (const t of theirPetTypes) {
        if (t && myPetTypes.has(t)) { score += 1; petLabel = `Both have ${t}s`; break; }
      }

      const contextLabel = buildSubtitle(mutualFriends, sharedGroups, petLabel);

      return { uid: id, displayName: u.displayName ?? 'Someone', avatarUrl: u.avatarUrl, score, mutualFriends, sharedGroups, contextLabel };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (candidates.length === 0) return null;

  const alreadySent = new Set([
    ...sentRequests.map(r => r.toUid),
    ...Array.from(pendingSent),
  ]);

  const handleAdd = async (targetUid: string) => {
    setPendingSent(prev => new Set(prev).add(targetUid));
    await sendFriendRequest(targetUid).catch(() => {});
  };

  const handleDismiss = async (targetUid: string) => {
    if (!profile) return;
    const next = [...(profile.dismissedSuggestions ?? []), targetUid];
    await updateProfile({ dismissedSuggestions: next } as Partial<UserProfile>);
  };

  return (
    <div>
      <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1.5">People You May Know</p>
      <div className="space-y-1">
        {candidates.map(c => (
          <div key={c.uid} className="flex items-center gap-2 px-1.5 py-1.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt={c.displayName} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-xs font-bold text-stone-600 dark:text-stone-300 shrink-0">{c.displayName[0]}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-700 dark:text-stone-200 truncate">{c.displayName}</p>
              {c.contextLabel && <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate">{c.contextLabel}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              {alreadySent.has(c.uid) ? (
                <span className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-0.5"><Check className="w-3 h-3" /> Pending</span>
              ) : (
                <button onClick={() => handleAdd(c.uid)}
                  className="p-1 rounded-lg text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  aria-label="Add friend">
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => handleDismiss(c.uid)}
                className="p-1 rounded-lg text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                aria-label="Dismiss">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
