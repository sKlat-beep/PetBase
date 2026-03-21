/**
 * Canonical UserProfile type for PetBase.
 * Used by AuthContext (localStorage) and firestoreService (Firestore non-PII fields).
 * PII fields (address) are encrypted before any Firestore write — see firestoreService.ts.
 */

export type ProfileVisibility = 'Public' | 'Friends Only' | 'Private';

export interface GamificationPrefs {
  // Tier Crest
  showCrest: boolean;
  badgeStyle: 'minimal' | 'crest' | 'glow';
  spiritIcon: string;              // material-symbols name
  showPointCount: boolean;
  publicCrestEnabled: boolean;     // show spirit icon on public avatar for other users

  // XP Ring
  showXpRing: boolean;
  ringColor: 'theme' | 'tier' | (string & {});  // 'theme', 'tier', or hex color string
  ringAnimation: 'static' | 'pulse' | 'shimmer';
  showLevelNumber: boolean;

  // Celebrations
  celebrateMilestones: boolean;
}

export const DEFAULT_GAMIFICATION_PREFS: GamificationPrefs = {
  showCrest: true,
  badgeStyle: 'crest',
  spiritIcon: 'pets',
  showPointCount: true,
  publicCrestEnabled: false,
  showXpRing: true,
  ringColor: 'tier',
  ringAnimation: 'pulse',
  showLevelNumber: true,
  celebrateMilestones: true,
};
export type AvatarShape = 'circle' | 'square' | 'squircle';
export type PublicStatus = 'None' | 'Open to Playdates' | 'Looking for Walking Buddies';

export interface UserProfile {
  displayName: string;
  username?: string;
  address: string;          // PII — encrypted before Firestore write
  zipCode?: string;
  visibility: ProfileVisibility;
  publicStatus: PublicStatus;
  blockedUsers: string[];
  lostPetOptOut: boolean;
  friends: string[];
  avatarUrl?: string;
  avatarShape?: AvatarShape;
  disableDMs?: boolean;               // default false
  disableGroupInvites?: boolean;      // default false
  showLastActive?: boolean;           // default true — privacy toggle for active status
  emailNotifications?: boolean;       // default false
  pushNotifications?: boolean;        // default false
  emailDigestFrequency?: 'daily' | 'weekly' | 'off';  // default 'off'
  lastSeen?: number;
  lastActive?: number;                // throttled presence timestamp (ms)
  mutedThreads?: string[];
  pinnedConversations?: string[];         // threadIds pinned to top of DM inbox
  dismissedSuggestions?: string[];
  savedServices?: string[];
  badges?: Array<{ id: string; unlockedAt: number }>; // Achievement badges earned
  petFollows?: string[];                 // petIds being followed
  gamificationPrefs?: GamificationPrefs;

  // Denormalized public crest fields — written alongside gamificationPrefs for O(1) reads
  publicCrestEnabled?: boolean;
  publicSpiritIcon?: string;
  publicTierColor?: string;
}

export interface AppNotification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'dm_received' | 'group_post' |
        'group_event' | 'group_invite' | 'event_reminder' | 'report_action' | 'mention' |
        'birthday' | 'vaccine' | 'medication' | 'lost_pet';
  fromUid?: string;
  fromName?: string;
  targetId?: string;
  targetType?: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  address: '',
  visibility: 'Public',     // Public by default — limited exposure (Display Name + pet types/count only)
  publicStatus: 'None',
  blockedUsers: [],
  lostPetOptOut: false,
  friends: [],
  disableDMs: false,
  disableGroupInvites: false,
  showLastActive: true,
  emailNotifications: false,
  pushNotifications: false,
  emailDigestFrequency: 'off',
};
