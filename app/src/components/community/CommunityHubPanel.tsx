import { useMemo } from 'react';
import { Link } from 'react-router';
import { Calendar, Users, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useSocial } from '../../contexts/SocialContext';
import { CollapsiblePanelWidget } from '../layout/CollapsiblePanelWidget';

export function CommunityHubPanel() {
  const { user, profile } = useAuth();
  const { pets } = usePets();
  const { groups } = useCommunity();
  const { directory, isBlocked } = useSocial();

  // ── Section 1: Suggested Groups ────────────────────────────────────────────

  const suggestedGroups = useMemo(() => {
    if (!user) return [];
    const petTypes = pets.map(p => p.type?.toLowerCase()).filter(Boolean) as string[];
    const notMember = groups.filter(g => !g.members[user.uid]);

    // groups whose tags overlap with user's pet types
    const withOverlap = notMember.filter(g =>
      g.tags.some(tag => petTypes.some(pt => tag.toLowerCase().includes(pt) || pt.includes(tag.toLowerCase())))
    );

    if (withOverlap.length >= 3) return withOverlap.slice(0, 3);

    // fall back to most recently created
    const fallback = [...notMember]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3);

    // merge: overlap first, then fill from fallback
    const seen = new Set(withOverlap.map(g => g.id));
    const merged = [...withOverlap];
    for (const g of fallback) {
      if (!seen.has(g.id) && merged.length < 3) merged.push(g);
    }
    return merged;
  }, [user, groups, pets]);

  const userGroups = useMemo(() => {
    if (!user) return [];
    return groups.filter(g => !!g.members[user.uid]);
  }, [user, groups]);

  const allGroupsJoined = groups.length > 0 && suggestedGroups.length === 0;

  // ── Section 2: Upcoming Events ─────────────────────────────────────────────

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return userGroups
      .flatMap(g => g.events.map(e => ({ ...e, groupName: g.name })))
      .filter(e => new Date(e.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [userGroups]);

  // ── Section 3: People You May Know ────────────────────────────────────────

  const peopleSuggestions = useMemo(() => {
    if (!user || !profile) return [];

    const friendSet = new Set(profile.friends ?? []);
    const myFriends = Array.from(friendSet);
    const blockedSet = new Set(profile.blockedUsers ?? []);

    // Collect all candidate UIDs from groups the current user belongs to
    const candidateUids = new Set<string>();
    for (const g of userGroups) {
      for (const uid of Object.keys(g.members)) {
        if (uid === user.uid) continue;
        if (friendSet.has(uid)) continue;
        if (blockedSet.has(uid)) continue;
        if (isBlocked(uid)) continue;
        candidateUids.add(uid);
      }
    }

    // Build scored suggestions
    const scored = Array.from(candidateUids).map(candidateUid => {
      const candidateProfile = directory.find(p => p.uid === candidateUid);
      let score = 0;

      // Mutual friends: +2 per mutual friend
      const candidateFriends: string[] = candidateProfile?.friends ?? [];
      const currentFriendSet = new Set(myFriends);
      const mutualCount = candidateFriends.filter(f => currentFriendSet.has(f)).length;
      score += mutualCount * 2;

      // Shared groups: +2 per shared group
      for (const g of userGroups) {
        if (g.members[candidateUid]) score += 2;
      }

      return { uid: candidateUid, count: score, profile: candidateProfile };
    });

    return scored
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [user, profile, userGroups, directory, isBlocked]);

  return (
    <div className="space-y-3">
      {/* Section 1: Suggested Groups */}
      <CollapsiblePanelWidget
        id="comm-suggested"
        title="Suggested Groups"
        icon={<Users className="w-3 h-3" />}
      >
        {allGroupsJoined ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            You&apos;re in all available groups! 🎉
          </p>
        ) : suggestedGroups.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">No groups to suggest yet</p>
        ) : (
          <div className="space-y-2.5">
            {suggestedGroups.map(g => {
              const memberCount = Object.keys(g.members).length;
              const firstTag = g.tags[0];
              return (
                <div key={g.id} className="flex items-center gap-2.5">
                  {g.image ? (
                    <img
                      src={g.image}
                      alt={g.name}
                      className="w-8 h-8 rounded-lg object-cover shrink-0 bg-neutral-100 dark:bg-neutral-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                        {g.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{g.name}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                      {firstTag && <> · <span className="text-emerald-600 dark:text-emerald-400">{firstTag}</span></>}
                    </p>
                  </div>
                  <Link
                    to="/community"
                    className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                  >
                    Join
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </CollapsiblePanelWidget>

      {/* Section 2: Upcoming Events */}
      <CollapsiblePanelWidget
        id="comm-events"
        title="Upcoming Events"
        icon={<Calendar className="w-3 h-3" />}
      >
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">No upcoming events in your groups</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(e => (
              <div key={e.id} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                <span className="mt-0.5 shrink-0" aria-hidden="true">📅</span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{e.title}</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                    {e.groupName} · {new Date(e.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsiblePanelWidget>

      {/* Section 3: People You May Know */}
      <CollapsiblePanelWidget
        id="comm-people"
        title="People You May Know"
        icon={<UserCheck className="w-3 h-3" />}
      >
        {peopleSuggestions.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">No suggestions right now</p>
        ) : (
          <div className="space-y-2.5">
            {peopleSuggestions.map(({ uid, count, profile: p }) => (
              <div key={uid} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase">
                    {(p?.displayName ?? uid).charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                    {p?.displayName ?? 'Member'}
                  </p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    in {count} of your group{count !== 1 ? 's' : ''}
                  </p>
                </div>
                <Link
                  to={`/community/people?uid=${uid}`}
                  className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </CollapsiblePanelWidget>
    </div>
  );
}
