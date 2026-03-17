import { useState, useEffect, useRef } from 'react';
import { User, Image as ImageIcon, Users2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { CollapsiblePanelWidget } from '../layout/CollapsiblePanelWidget';
import { useAvatarUrl } from '../../lib/useAvatarUrl';
import { searchPublicProfiles } from '../../lib/firestoreService';
import type { DmMessage } from '../../lib/firestoreService';
import { NewConversationSearch } from './NewConversationSearch';
import { FriendRequestInboxWidget } from './FriendRequestInboxWidget';
import { OnlineContactsStrip } from './OnlineContactsStrip';
import { FriendsListWidget } from './FriendsListWidget';
import { PeopleYouMayKnowWidget } from './PeopleYouMayKnowWidget';
import { GroupsWidget } from './GroupsWidget';

interface ProfileEntry {
  displayName: string;
  avatarUrl: string;
  lastSeen?: number;
}

// Hook to fetch/cache profiles for a set of uids
function usePanelProfileCache(uids: string[]): Record<string, ProfileEntry> {
  const [cache, setCache] = useState<Record<string, ProfileEntry>>({});
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (uids.length === 0) return;
    const key = [...uids].sort().join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    searchPublicProfiles('').then(profiles => {
      const map: Record<string, ProfileEntry> = {};
      profiles.forEach(p => {
        if (uids.includes(p.uid)) {
          map[p.uid] = { displayName: p.displayName, avatarUrl: p.avatarUrl };
        }
      });
      setCache(map);
    }).catch(() => {});
  }, [uids]); // eslint-disable-line react-hooks/exhaustive-deps

  return cache;
}

interface MessagesRightPanelProps {
  activeUid: string | null;
  displayName: string;
  rawAvatarUrl: string;
  threadMessages: DmMessage[];
  onViewProfile: () => void;
  onBlock: () => void;
  onReport: () => void;
  friendUids?: string[];
  conversationUids?: string[];
}

export function MessagesRightPanel({
  activeUid,
  displayName,
  rawAvatarUrl,
  threadMessages,
  onViewProfile,
  onBlock,
  onReport,
  friendUids = [],
  conversationUids = [],
}: MessagesRightPanelProps) {
  const { user, profile } = useAuth();
  const { groups } = useCommunity();
  const { conversations } = useMessaging();
  const [activeTab, setActiveTab] = useState<'contact' | 'find'>('contact');

  // Reset to contact tab when conversation changes
  useEffect(() => {
    setActiveTab('contact');
  }, [activeUid]);

  const otherAvatar = useAvatarUrl(activeUid ?? '', rawAvatarUrl);
  const ownAvatar = useAvatarUrl(user?.uid ?? '', profile?.avatarUrl ?? '');

  const initials = (displayName || '?').charAt(0).toUpperCase();
  const ownInitials = (profile?.displayName || '?').charAt(0).toUpperCase();

  // Build profile cache for discovery view
  const allUids = [...new Set([...conversationUids, ...friendUids])];
  const profileCache = usePanelProfileCache(allUids);

  // Discovery view — shown when no active conversation OR in Find tab
  const discoveryView = (showContacts: boolean) => (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1.5">New Message</p>
        <NewConversationSearch />
      </div>

      {/* Friend request inbox */}
      <FriendRequestInboxWidget />

      {/* Recent contacts strip */}
      {showContacts && <OnlineContactsStrip profileCache={profileCache} />}

      {/* Friends list */}
      <FriendsListWidget profileCache={profileCache} />

      {/* People you may know */}
      <PeopleYouMayKnowWidget />

      {/* Groups */}
      <GroupsWidget />
    </div>
  );

  if (activeUid !== null) {
    // Shared groups
    const sharedGroups = groups.filter(g =>
      user && activeUid &&
      g.members[user.uid] && g.members[activeUid]
    ).length;

    // Shared media
    const sharedMedia = threadMessages.filter(m => m.mediaUrl);

    return (
      <div className="space-y-3">
        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5
              ${activeTab === 'contact'
                ? 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            <User className="w-3.5 h-3.5" />
            Contact
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5
              ${activeTab === 'find'
                ? 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            <Users2 className="w-3.5 h-3.5" />
            Find People
          </button>
        </div>

        {activeTab === 'contact' ? (
          <>
            {/* Contact Info */}
            <CollapsiblePanelWidget id={`msg-contact-${activeUid}`} title="Contact Info" icon={<User className="w-3 h-3" />}>
              <div className="space-y-3">
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center gap-2">
                  {otherAvatar ? (
                    <img
                      src={otherAvatar}
                      alt={displayName}
                      className="w-14 h-14 rounded-full object-cover bg-neutral-100 dark:bg-neutral-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xl font-bold text-neutral-600 dark:text-neutral-300">
                      {initials}
                    </div>
                  )}
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{displayName}</p>
                  {sharedGroups > 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {sharedGroups} shared group{sharedGroups !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={onViewProfile}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={onBlock}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    Block User
                  </button>
                  <button
                    onClick={onReport}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                  >
                    Report
                  </button>
                </div>
              </div>
            </CollapsiblePanelWidget>

            {/* Shared Media */}
            <CollapsiblePanelWidget id={`msg-media-${activeUid}`} title="Shared Media" icon={<ImageIcon className="w-3 h-3" />}>
              {sharedMedia.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">No shared media yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {sharedMedia.slice(0, 9).map(m => (
                    <img
                      key={m.id}
                      src={m.mediaUrl}
                      alt=""
                      className="w-full aspect-square object-cover rounded-lg"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </CollapsiblePanelWidget>
          </>
        ) : (
          /* Find People tab — discovery without contacts strip (user is already in a convo) */
          discoveryView(false)
        )}
      </div>
    );
  }

  // No active conversation — show own profile + full discovery view
  return (
    <div className="space-y-4">
      <CollapsiblePanelWidget id="msg-own-profile" title="Your Profile" icon={<User className="w-3 h-3" />}>
        <div className="flex flex-col items-center text-center gap-2">
          {ownAvatar ? (
            <img
              src={ownAvatar}
              alt={profile?.displayName ?? ''}
              className="w-14 h-14 rounded-full object-cover bg-neutral-100 dark:bg-neutral-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xl font-bold text-neutral-600 dark:text-neutral-300">
              {ownInitials}
            </div>
          )}
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{profile?.displayName}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </CollapsiblePanelWidget>

      {discoveryView(true)}
    </div>
  );
}
