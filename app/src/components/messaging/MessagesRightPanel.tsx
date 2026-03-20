import { useState, useEffect, useRef } from 'react';
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
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">New Message</p>
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
        <div className="flex gap-1 p-1 bg-surface-container rounded-xl">
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5
              ${activeTab === 'contact'
                ? 'bg-surface-container-low text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[14px]">person</span>
            Contact
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5
              ${activeTab === 'find'
                ? 'bg-surface-container-low text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[14px]">group</span>
            Find People
          </button>
        </div>

        {activeTab === 'contact' ? (
          <>
            {/* Contact Info */}
            <CollapsiblePanelWidget id={`msg-contact-${activeUid}`} title="Contact Info" icon={<span className="material-symbols-outlined text-[12px]">person</span>}>
              <div className="space-y-3">
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center gap-2">
                  {otherAvatar ? (
                    <img
                      src={otherAvatar}
                      alt={displayName}
                      className="w-14 h-14 rounded-full object-cover bg-surface-container-highest"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-xl font-bold text-on-surface-variant">
                      {initials}
                    </div>
                  )}
                  <p className="text-sm font-semibold text-on-surface">{displayName}</p>
                  {sharedGroups > 0 && (
                    <p className="text-xs text-on-surface-variant">
                      {sharedGroups} shared group{sharedGroups !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={onViewProfile}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-surface-container-highest text-on-surface hover:bg-surface-container transition-colors"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={onBlock}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-surface-container-highest text-error hover:bg-error-container transition-colors"
                  >
                    Block User
                  </button>
                  <button
                    onClick={onReport}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-surface-container-highest text-on-surface-variant hover:bg-surface-container transition-colors"
                  >
                    Report
                  </button>
                </div>
              </div>
            </CollapsiblePanelWidget>

            {/* Shared Media */}
            <CollapsiblePanelWidget id={`msg-media-${activeUid}`} title="Shared Media" icon={<span className="material-symbols-outlined text-[12px]">image</span>}>
              {sharedMedia.length === 0 ? (
                <p className="text-xs text-on-surface-variant">No shared media yet.</p>
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
      <CollapsiblePanelWidget id="msg-own-profile" title="Your Profile" icon={<span className="material-symbols-outlined text-[12px]">person</span>}>
        <div className="flex flex-col items-center text-center gap-2">
          {ownAvatar ? (
            <img
              src={ownAvatar}
              alt={profile?.displayName ?? ''}
              className="w-14 h-14 rounded-full object-cover bg-surface-container-highest"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-xl font-bold text-on-surface-variant">
              {ownInitials}
            </div>
          )}
          <p className="text-sm font-semibold text-on-surface">{profile?.displayName}</p>
          <p className="text-xs text-on-surface-variant">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </CollapsiblePanelWidget>

      {discoveryView(true)}
    </div>
  );
}
