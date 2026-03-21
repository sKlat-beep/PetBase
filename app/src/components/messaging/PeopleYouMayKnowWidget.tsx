import { useState } from 'react';
import { useSocial } from '../../contexts/SocialContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import type { UserProfile } from '../../types/user';

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

  const myFriendSet = new Set(profile?.friends ?? []);
  const dismissed = new Set(profile?.dismissedSuggestions ?? []);
  const blocked = new Set((profile as any)?.blockedUsers ?? []);
  const uid = user?.uid ?? '';

  // Build joined groups: CommunityGroup[] filtered by membership
  const joinedGroups = groups.filter(g => g.members?.[uid]);

  // Score candidates — groups signal only (TASK-222: mutual-friends signal removed)
  const candidates = directory
    .filter(u => {
      const id = u.uid;
      return id && id !== uid && !myFriendSet.has(id) && !dismissed.has(id) && !blocked.has(id);
    })
    .map(u => {
      const id = u.uid;
      let score = 0;

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

      const contextLabel = buildSubtitle(0, sharedGroups, petLabel);

      return { uid: id, displayName: u.displayName ?? 'Someone', avatarUrl: u.avatarUrl, score, mutualFriends: 0, sharedGroups, contextLabel };
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
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">People You May Know</p>
      <div className="space-y-1">
        {candidates.map(c => (
          <div key={c.uid} className="flex items-center gap-2 px-1.5 py-1.5 rounded-xl hover:bg-surface-container-highest transition-colors">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt={c.displayName} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-on-surface-variant shrink-0">{c.displayName[0]}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-on-surface truncate">{c.displayName}</p>
              {c.contextLabel && <p className="text-xs text-on-surface-variant truncate">{c.contextLabel}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              {alreadySent.has(c.uid) ? (
                <span className="text-xs text-on-surface-variant flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">check</span> Pending</span>
              ) : (
                <button onClick={() => handleAdd(c.uid)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors"
                  aria-label="Add friend">
                  <span className="material-symbols-outlined text-[14px]">person_add</span>
                </button>
              )}
              <button onClick={() => handleDismiss(c.uid)}
                className="p-1 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                aria-label="Dismiss">
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
