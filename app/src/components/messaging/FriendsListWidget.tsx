import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { isOnline } from '../../utils/presence';
import type { UserProfile } from '../../types/user';

interface ProfileEntry {
  displayName: string;
  avatarUrl?: string;
  lastSeen?: number;
}

interface FriendsListWidgetProps {
  profileCache: Record<string, ProfileEntry>;
}

export function FriendsListWidget({ profileCache }: FriendsListWidgetProps) {
  const { profile, updateProfile } = useAuth() as {
    profile: (UserProfile & { friends?: string[] }) | null;
    updateProfile: (u: Partial<UserProfile>) => Promise<void>;
  };
  const { conversations, setActiveUid } = useMessaging();
  const [sort, setSort] = useState<'recent' | 'az'>(() => (localStorage.getItem('msg-friends-sort') as 'recent' | 'az') ?? 'recent');
  const [menuUid, setMenuUid] = useState<string | null>(null);

  const friends = profile?.friends ?? [];
  const muted = profile?.mutedThreads ?? [];

  const convoMap = new Map((conversations ?? []).map((c: any) => [c.otherUid, c.lastMessage?.createdAt ?? 0]));

  const sorted = [...friends]
    .filter(uid => profileCache[uid])
    .sort((a, b) => {
      if (sort === 'az') return (profileCache[a]?.displayName ?? '').localeCompare(profileCache[b]?.displayName ?? '');
      return (convoMap.get(b) ?? 0) - (convoMap.get(a) ?? 0);
    });

  if (sorted.length === 0) return null;

  const handleSort = (s: 'recent' | 'az') => { setSort(s); localStorage.setItem('msg-friends-sort', s); };

  const handleMute = async (uid: string) => {
    if (!profile) return;
    const next = muted.includes(uid) ? muted.filter(m => m !== uid) : [...muted, uid];
    await updateProfile({ mutedThreads: next } as Partial<UserProfile>);
    setMenuUid(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">Friends</p>
        <div className="flex gap-1">
          {(['recent', 'az'] as const).map(s => (
            <button key={s} onClick={() => handleSort(s)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${sort === s ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {s === 'recent' ? 'Recent' : 'A–Z'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {sorted.slice(0, 20).map(uid => {
          const p = profileCache[uid];
          if (!p) return null;
          const isMuted = muted.includes(uid);
          return (
            <div key={uid} className="flex items-center gap-2 px-1.5 py-1.5 rounded-xl hover:bg-surface-container-highest group transition-colors relative">
              <div className="relative shrink-0">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-on-primary-container">{p.displayName[0]}</div>
                )}
                {isOnline(p.lastSeen) && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-primary border border-surface" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="text-xs font-medium text-on-surface truncate">{p.displayName}</span>
                {isMuted && <span className="material-symbols-outlined text-on-surface-variant text-[12px]">volume_off</span>}
              </div>
              <div className="hidden group-hover:flex gap-1 shrink-0">
                <button onClick={() => setActiveUid(uid)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors">
                  <span className="material-symbols-outlined text-[14px]">chat</span>
                </button>
                <button onClick={() => setMenuUid(menuUid === uid ? null : uid)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors">
                  <span className="material-symbols-outlined text-[14px]">more_horiz</span>
                </button>
              </div>
              {menuUid === uid && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-surface-container border border-outline-variant rounded-xl shadow-xl py-1 min-w-[120px]">
                  <button onClick={() => handleMute(uid)}
                    className="w-full px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">volume_off</span>
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
