/**
 * CommunityContext — Phase 7 Firestore Migration
 *
 * Data model:
 *   groups/{groupId}                 — group metadata (name, description, image, createdAt, ownerId)
 *   groups/{groupId}/members/{uid}   — GroupMember (role, joinedAt, userId)
 *   groups/{groupId}/posts/{postId}  — GroupPost
 *   groups/{groupId}/events/{eventId}— GroupEvent
 *
 * Strategy:
 *   - onSnapshot on the top-level `groups` collection detects group adds/removes in real time.
 *   - On each snapshot, subcollections (members, posts, events) are fetched via getDocs and
 *     assembled into the existing CommunityGroup interface — component code is unchanged.
 *   - All mutations write to Firestore AND update local state optimistically so the UI is
 *     immediately responsive without waiting for the next snapshot cycle.
 *   - userPreferences (isFavorite, lastVisited) are UI-only per-user state; they stay in
 *     localStorage and are never written to Firestore.
 *
 * Cross-device subcollection sync:
 *   The onSnapshot only fires on top-level group document changes (metadata). Post/event/member
 *   changes made on another device will appear after the next group metadata change or on
 *   page reload. Full per-subcollection real-time sync is deferred to Phase 8.
 *
 * Security Rules: see firestoreService.ts JSDoc for the full rules block.
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import {
  collection, doc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, getDocs, writeBatch, arrayUnion, arrayRemove,
  query, where, limit, orderBy, startAfter, type DocumentSnapshot, Timestamp,
} from 'firebase/firestore';

/** Convert Firestore Timestamp fields to epoch ms numbers. */
function coerceTimestamps<T>(data: Record<string, unknown>): T {
  for (const key of ['createdAt', 'updatedAt', 'expiresAt', 'joinedAt'] as const) {
    const v = data[key];
    if (v instanceof Timestamp) {
      data[key] = v.toMillis();
    }
  }
  return data as T;
}
import { db } from '../lib/firebase';
import {
  fetchPublicProfileById,
  saveGroupComment,
  deleteGroupComment,
  reactToGroupComment,
  createEventPost as fsCreateEventPost,
  deleteEventPost as fsDeleteEventPost,
  reactToEventPost as fsReactToEventPost,
  createNotification,
  getGroupPostsPaginated,
  type GroupComment,
  type EventPost,
} from '../lib/firestoreService';
export type { GroupComment, EventPost } from '../lib/firestoreService';
import { useAuth } from './AuthContext';
import { useSocial } from './SocialContext';
import { logActivity } from '../utils/activityLog';
import { uploadGroupPostImage } from '../lib/storageService';
import { awardPoints } from '../lib/gamificationService';

export type CommunityRole = 'Owner' | 'Moderator' | 'Event Coordinator' | 'User';

export interface GroupMember {
  userId: string;
  role: CommunityRole;
  joinedAt: number;
}

export interface GroupEvent {
  id: string;
  title: string;
  date: string; // ISO string
  location: string;
  description: string;
  attendeeIds: string[];
  createdBy: string;
}

export interface GroupPost {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  isPinned: boolean;
  isSystemPost?: boolean;
  isFlagged?: boolean;
  flagCount?: number;
  reactions?: {
    paw: string[];
    bone: string[];
    heart: string[];
  };
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  image: string;
  createdAt: number;
  tags: string[]; // Up to 10 search/filter tags
  retentionDays: number; // Owner-configurable post retention (default 365)
  members: Record<string, GroupMember>; // userId -> GroupMember
  posts: GroupPost[];
  events: GroupEvent[];
  bannedMembers: string[]; // UIDs of banned users
  welcomePostEnabled?: boolean; // Owner toggle: auto-post when a new member joins
}

export interface UserGroupPreferences {
  isFavorite: boolean;
  lastVisitedAt: number;
}

interface CommunityContextValue {
  groups: CommunityGroup[];
  userPreferences: Record<string, UserGroupPreferences>;
  loading: boolean;
  hasMorePosts: Record<string, boolean>;
  loadMorePosts: (groupId: string) => Promise<void>;
  createGroup: (name: string, description: string, image?: string, tags?: string[]) => Promise<string | void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  toggleFavorite: (groupId: string) => void;
  createPost: (groupId: string, content: string, imageFile?: File) => Promise<void>;
  pinPost: (groupId: string, postId: string, isPinned: boolean) => Promise<void>;
  deletePost: (groupId: string, postId: string) => Promise<void>;
  rsvpEvent: (groupId: string, eventId: string, joining: boolean) => Promise<void>;
  createEvent: (groupId: string, event: Omit<GroupEvent, 'id' | 'attendeeIds' | 'createdBy'>) => Promise<void>;
  deleteEvent: (groupId: string, eventId: string) => Promise<void>;
  updateMemberRole: (groupId: string, targetUserId: string, newRole: CommunityRole) => Promise<void>;
  updateGroupRetention: (groupId: string, days: number) => Promise<void>;
  banMember: (groupId: string, targetUid: string) => Promise<void>;
  unbanMember: (groupId: string, targetUid: string) => Promise<void>;
  reactToPost: (groupId: string, postId: string, emoji: 'paw' | 'bone' | 'heart') => Promise<void>;
  inviteUserToGroup: (groupId: string, targetUid: string) => Promise<void>;
  addComment: (groupId: string, postId: string, content: string, parentCommentId?: string) => Promise<void>;
  deleteComment: (groupId: string, postId: string, commentId: string, authorId: string) => Promise<void>;
  reactToComment: (groupId: string, postId: string, commentId: string, reaction: 'paw' | 'bone' | 'heart', alreadyReacted: boolean) => Promise<void>;
  createEventPost: (groupId: string, eventId: string, content: string) => Promise<void>;
  deleteEventPost: (groupId: string, eventId: string, postId: string, authorId: string) => Promise<void>;
  reactToEventPost: (groupId: string, eventId: string, postId: string, reaction: 'paw' | 'bone' | 'heart', alreadyReacted: boolean) => Promise<void>;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

const STORAGE_KEY_PREFS = 'petbase_community_prefs';

/** Fetch all subcollections for a single group and assemble a CommunityGroup. */
async function fetchGroupFull(
  groupId: string,
  gData: Record<string, any>,
  lastPostDocRef?: React.MutableRefObject<Record<string, DocumentSnapshot | null>>,
  setHasMorePosts?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
): Promise<CommunityGroup> {
  const postsQuery = query(
    collection(db, 'groups', groupId, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(20),
  );
  const [membersSnap, postsSnap, eventsSnap] = await Promise.all([
    getDocs(collection(db, 'groups', groupId, 'members')),
    getDocs(postsQuery),
    getDocs(collection(db, 'groups', groupId, 'events')),
  ]);
  if (lastPostDocRef) {
    lastPostDocRef.current = { ...lastPostDocRef.current, [groupId]: postsSnap.docs[postsSnap.docs.length - 1] ?? null };
  }
  if (setHasMorePosts) {
    setHasMorePosts(prev => ({ ...prev, [groupId]: postsSnap.docs.length === 20 }));
  }

  const members: Record<string, GroupMember> = {};
  membersSnap.docs.forEach(d => { members[d.id] = coerceTimestamps<GroupMember>({ ...d.data() }); });

  return {
    id: groupId,
    name: gData.name ?? '',
    description: gData.description ?? '',
    image: gData.image ?? '',
    createdAt: gData.createdAt instanceof Timestamp ? gData.createdAt.toMillis() : (gData.createdAt ?? Date.now()),
    tags: gData.tags ?? [],
    retentionDays: gData.retentionDays ?? 365,
    bannedMembers: gData.bannedMembers ?? [],
    members,
    posts: postsSnap.docs.map(d => coerceTimestamps<GroupPost>({ id: d.id, ...d.data() })),
    events: eventsSnap.docs.map(d => coerceTimestamps<GroupEvent>({ id: d.id, ...d.data() })),
  };
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { isBlocked } = useSocial();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [userPreferences, setUserPreferences] = useState<Record<string, UserGroupPreferences>>({});
  const [loading, setLoading] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState<Record<string, boolean>>({});
  const lastPostDocRef = useRef<Record<string, DocumentSnapshot | null>>({});

  // Mutable ref so callbacks always see the latest groups without stale closures
  const groupsRef = useRef<CommunityGroup[]>([]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);

  // Keep isBlocked in a ref so the onSnapshot callback always uses the latest version
  // without needing to re-subscribe to the groups collection on every profile change.
  const isBlockedRef = useRef(isBlocked);
  useEffect(() => { isBlockedRef.current = isBlocked; }, [isBlocked]);

  // userPreferences: per-user UI state only — stays in localStorage
  useEffect(() => {
    if (user) {
      try {
        const raw = localStorage.getItem(`${STORAGE_KEY_PREFS}_${user.uid}`);
        setUserPreferences(raw ? JSON.parse(raw) : {});
      } catch { setUserPreferences({}); }
    } else {
      setUserPreferences({});
    }
  }, [user]);

  useEffect(() => {
    if (user && !loading) {
      localStorage.setItem(`${STORAGE_KEY_PREFS}_${user.uid}`, JSON.stringify(userPreferences));
    }
  }, [userPreferences, user, loading]);

  // Subscribe to the top-level groups collection.
  // On each snapshot (group added/removed/metadata changed), fetch subcollections and
  // assemble the full CommunityGroup array.
  useEffect(() => {
    if (!user) { setGroups([]); setLoading(false); return; }
    setLoading(true);

    const unsub = onSnapshot(collection(db, 'groups'), async (snap) => {
      const assembled = await Promise.all(
        snap.docs.map(d => fetchGroupFull(d.id, d.data(), lastPostDocRef, setHasMorePosts))
      );
      // Filter out posts from blocked users before storing in state
      setGroups(assembled.map(g => ({
        ...g,
        posts: g.posts.filter(p => !isBlockedRef.current(p.authorId)),
      })));
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // --- Mutations (Firestore write + optimistic local state) ----------------

  const createGroup = useCallback(async (
    name: string,
    description: string,
    image = 'https://picsum.photos/seed/group/400/300',
    tags: string[] = [],
  ) => {
    if (!user) return;
    try {
      const ownedCount = groupsRef.current.filter(g => g.members[user.uid]?.role === 'Owner').length;
      if (ownedCount >= 3) return 'You can only own up to 3 groups.';

      // Uniqueness check — case-insensitive via nameLower field
      const trimmedName = name.trim();
      const nameLower = trimmedName.toLowerCase();
      const existingSnap = await getDocs(query(collection(db, 'groups'), where('nameLower', '==', nameLower), limit(1)));
      if (!existingSnap.empty) return `A group named "${trimmedName}" already exists. Please choose a different name.`;

      const groupRef = doc(collection(db, 'groups'));
      const groupId = groupRef.id;
      const now = Date.now();

      const batch = writeBatch(db);
      batch.set(groupRef, { name: trimmedName, nameLower, description, image, createdAt: now, updatedAt: now, ownerId: user.uid, tags: tags.slice(0, 10), retentionDays: 365 });
      batch.set(doc(db, 'groups', groupId, 'members', user.uid), {
        userId: user.uid, role: 'Owner', joinedAt: now,
      });
      await batch.commit();

      // Optimistic local update — immediately show the new group
      const optimisticGroup: CommunityGroup = {
        id: groupId,
        name: trimmedName,
        description,
        image,
        createdAt: now,
        tags: tags.slice(0, 10),
        retentionDays: 365,
        bannedMembers: [],
        members: { [user.uid]: { userId: user.uid, role: 'Owner', joinedAt: now } },
        posts: [],
        events: [],
      };
      setGroups(prev => [optimisticGroup, ...prev]);

      setUserPreferences(prev => ({ ...prev, [groupId]: { isFavorite: false, lastVisitedAt: now } }));
      // onSnapshot will replace the optimistic entry with real data
    } catch (err: any) {
      console.error('Failed to create community group:', err);
      return `Failed to create group: ${err.message || 'Unknown error'}`;
    }
  }, [user]);

  const joinGroup = useCallback(async (groupId: string) => {
    if (!user) return;
    // Owners cannot join their own group as a User — they already own it
    const existingRole = groupsRef.current.find(g => g.id === groupId)?.members[user.uid]?.role;
    if (existingRole === 'Owner') return;
    // Banned users cannot join
    const group = groupsRef.current.find(g => g.id === groupId);
    if (group?.bannedMembers?.includes(user.uid)) throw new Error('BANNED');
    const memberData: GroupMember = { userId: user.uid, role: 'User', joinedAt: Date.now() };

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, members: { ...g.members, [user.uid]: memberData } };
    }));

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'groups', groupId, 'members', user.uid), memberData);
      batch.update(doc(db, 'groups', groupId), { updatedAt: Date.now() });
      await batch.commit();
    } catch (err: any) {
      // Rollback optimistic update
      setGroups(prev => prev.map(g => {
        if (g.id !== groupId) return g;
        const { [user.uid]: _, ...rest } = g.members;
        return { ...g, members: rest };
      }));
      console.error('joinGroup failed:', err);
      throw err;
    }

    setUserPreferences(prev => ({ ...prev, [groupId]: { isFavorite: false, lastVisitedAt: Date.now() } }));

    const joinedGroup = groupsRef.current.find(g => g.id === groupId);
    const groupName = joinedGroup?.name ?? groupId;
    logActivity(user.uid, `Joined group: ${groupName}`);

    // Welcome bot post (if enabled by group owner)
    if (joinedGroup?.welcomePostEnabled !== false) {
      const displayName = user.displayName || 'Someone';
      const welcomeContent = `👋 ${displayName} just joined the group! Say hello!`;
      const welcomePostRef = doc(collection(db, 'groups', groupId, 'posts'));
      const welcomePost: Omit<GroupPost, 'id'> = {
        authorId: 'system',
        authorName: 'PetBase',
        content: welcomeContent,
        createdAt: Date.now(),
        isPinned: false,
        isSystemPost: true,
      };
      setDoc(welcomePostRef, welcomePost).catch(() => {});
      setGroups(prev => prev.map(g => {
        if (g.id !== groupId) return g;
        return { ...g, posts: [{ ...welcomePost, id: welcomePostRef.id }, ...g.posts] };
      }));
    }

    if (localStorage.getItem('petbase-step-join-community') !== 'true') {
      localStorage.setItem('petbase-step-join-community', 'true');
      window.dispatchEvent(new Event('petbase-guide-update'));
    }
    awardPoints(user.uid, 'join-group').catch(() => {});
  }, [user]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return;

    const group = groupsRef.current.find(g => g.id === groupId);
    const groupName = group?.name ?? groupId;
    const memberList = Object.values(group?.members ?? {}) as GroupMember[];
    const ownerList = memberList.filter(m => m.role === 'Owner');
    const isLastOwner = ownerList.length === 1 && ownerList[0].userId === user.uid;
    const isLastMember = memberList.length === 1;

    // Rule 2: Last owner must transfer or disband before leaving
    if (isLastOwner && !isLastMember) {
      throw new Error('LAST_OWNER');
    }

    // Rule 1: Last member leaving → hard-delete the entire group
    if (isLastMember) {
      setGroups(prev => prev.filter(g => g.id !== groupId));
      const batch = writeBatch(db);
      // Fetch and queue deletion of all subcollection docs
      const [postsSnap, eventsSnap, membersSnap] = await Promise.all([
        getDocs(collection(db, 'groups', groupId, 'posts')),
        getDocs(collection(db, 'groups', groupId, 'events')),
        getDocs(collection(db, 'groups', groupId, 'members')),
      ]);
      postsSnap.docs.forEach(d => batch.delete(d.ref));
      eventsSnap.docs.forEach(d => batch.delete(d.ref));
      membersSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'groups', groupId));
      await batch.commit();
      logActivity(user.uid, `Disbanded group (last member): ${groupName}`);
      return;
    }

    // Normal leave
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const newMembers = { ...g.members };
      delete newMembers[user.uid];
      return { ...g, members: newMembers };
    }));

    const batch = writeBatch(db);
    batch.delete(doc(db, 'groups', groupId, 'members', user.uid));
    batch.update(doc(db, 'groups', groupId), { updatedAt: Date.now() });
    await batch.commit();

    logActivity(user.uid, `Left group: ${groupName}`);
  }, [user]);

  const toggleFavorite = useCallback((groupId: string) => {
    if (!user) return;
    setUserPreferences(prev => {
      const current = prev[groupId] || { isFavorite: false, lastVisitedAt: Date.now() };
      return { ...prev, [groupId]: { ...current, isFavorite: !current.isFavorite } };
    });
  }, [user]);

  const createPost = useCallback(async (groupId: string, content: string, imageFile?: File) => {
    if (!user) return;

    // Reserve a Firestore doc ID upfront so we can use it as the storage path
    const postRef = doc(collection(db, 'groups', groupId, 'posts'));
    const newPostId = postRef.id;

    // Upload image first if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await uploadGroupPostImage(groupId, newPostId, imageFile);
    }

    const newPost: Omit<GroupPost, 'id'> = {
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      authorImage: user.photoURL || undefined,
      content,
      createdAt: Date.now(),
      isPinned: false,
      ...(imageUrl ? { imageUrl } : {}),
    };

    // Optimistic with temp ID
    const tempId = crypto.randomUUID();
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, posts: [{ ...newPost, id: tempId }, ...g.posts] };
    }));

    await setDoc(postRef, newPost);

    // Replace temp ID with real Firestore ID
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, posts: g.posts.map(p => p.id === tempId ? { ...p, id: newPostId } : p) };
    }));
    awardPoints(user.uid, 'create-post').catch(() => {});
  }, [user]);

  const pinPost = useCallback(async (groupId: string, postId: string, isPinned: boolean) => {
    if (!user) return;
    const group = groupsRef.current.find(g => g.id === groupId);
    if (!group) return;

    const pinnedCount = group.posts.filter(p => p.isPinned && p.id !== postId).length;
    if (isPinned && pinnedCount >= 3) {
      alert('You can only pin up to 3 posts.');
      return;
    }

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, posts: g.posts.map(p => p.id === postId ? { ...p, isPinned } : p) };
    }));

    await updateDoc(doc(db, 'groups', groupId, 'posts', postId), { isPinned });
  }, [user]);

  const deletePost = useCallback(async (groupId: string, postId: string) => {
    if (!user) return;

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, posts: g.posts.filter(p => p.id !== postId) };
    }));

    await deleteDoc(doc(db, 'groups', groupId, 'posts', postId));
  }, [user]);

  const reactToPost = useCallback(async (
    groupId: string,
    postId: string,
    emoji: 'paw' | 'bone' | 'heart'
  ) => {
    if (!user) return;
    const postRef = doc(db, 'groups', groupId, 'posts', postId);
    const currentGroup = groupsRef.current.find(g => g.id === groupId);
    const post = currentGroup?.posts.find(p => p.id === postId);
    const alreadyReacted = post?.reactions?.[emoji]?.includes(user.uid) ?? false;
    await updateDoc(postRef, {
      [`reactions.${emoji}`]: alreadyReacted
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid),
    });
    // Optimistic local update
    setGroups(prev => prev.map(g =>
      g.id !== groupId ? g : {
        ...g,
        posts: g.posts.map(p =>
          p.id !== postId ? p : {
            ...p,
            reactions: {
              paw:   p.reactions?.paw   ?? [],
              bone:  p.reactions?.bone  ?? [],
              heart: p.reactions?.heart ?? [],
              [emoji]: alreadyReacted
                ? (p.reactions?.[emoji] ?? []).filter(uid => uid !== user.uid)
                : [...(p.reactions?.[emoji] ?? []), user.uid],
            },
          }
        ),
      }
    ));
  }, [user]);

  const rsvpEvent = useCallback(async (groupId: string, eventId: string, joining: boolean) => {
    if (!user) return;

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        events: g.events.map(e => {
          if (e.id !== eventId) return e;
          const attendeeIds = joining
            ? [...new Set([...e.attendeeIds, user.uid])]
            : e.attendeeIds.filter(id => id !== user.uid);
          return { ...e, attendeeIds };
        }),
      };
    }));

    await updateDoc(doc(db, 'groups', groupId, 'events', eventId), {
      attendeeIds: joining ? arrayUnion(user.uid) : arrayRemove(user.uid),
    });
  }, [user]);

  const createEvent = useCallback(async (
    groupId: string,
    eventData: Omit<GroupEvent, 'id' | 'attendeeIds' | 'createdBy'>,
  ) => {
    if (!user) return;
    const newEventData = { ...eventData, attendeeIds: [user.uid], createdBy: user.uid };
    const tempId = crypto.randomUUID();

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, events: [...g.events, { ...newEventData, id: tempId }] };
    }));

    const docRef = await addDoc(collection(db, 'groups', groupId, 'events'), newEventData);

    // Replace temp ID
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, events: g.events.map(e => e.id === tempId ? { ...e, id: docRef.id } : e) };
    }));
  }, [user]);

  const deleteEvent = useCallback(async (groupId: string, eventId: string) => {
    if (!user) return;

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, events: g.events.filter(e => e.id !== eventId) };
    }));

    await deleteDoc(doc(db, 'groups', groupId, 'events', eventId));
  }, [user]);

  const updateMemberRole = useCallback(async (
    groupId: string,
    targetUserId: string,
    newRole: CommunityRole,
  ) => {
    if (!user) return;
    const group = groupsRef.current.find(g => g.id === groupId);
    if (!group || group.members[user.uid]?.role !== 'Owner') return;

    if (newRole !== 'Owner' && group.members[targetUserId]?.role === 'Owner') {
      const ownerCount = (Object.values(group.members) as GroupMember[]).filter(m => m.role === 'Owner').length;
      if (ownerCount <= 1) {
        alert('Cannot change the role of the last owner. Promote someone else first.');
        return;
      }
    }

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        members: {
          ...g.members,
          [targetUserId]: {
            ...(g.members[targetUserId] || { userId: targetUserId, joinedAt: Date.now() }),
            role: newRole,
          },
        },
      };
    }));

    await updateDoc(doc(db, 'groups', groupId, 'members', targetUserId), { role: newRole });
  }, [user]);

  const updateGroupRetention = useCallback(async (groupId: string, days: number) => {
    if (!user) return;
    const group = groupsRef.current.find(g => g.id === groupId);
    if (!group || group.members[user.uid]?.role !== 'Owner') return;

    // Optimistic
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, retentionDays: days } : g));

    await updateDoc(doc(db, 'groups', groupId), { retentionDays: days, updatedAt: Date.now() });
  }, [user]);

  const banMember = useCallback(async (groupId: string, targetUid: string) => {
    if (!user) return;
    const group = groupsRef.current.find(g => g.id === groupId);
    if (!group) return;
    const myRole = group.members[user.uid]?.role;
    if (myRole !== 'Owner' && myRole !== 'Moderator') return;
    // Cannot ban the group Owner
    if (group.members[targetUid]?.role === 'Owner') return;
    // Moderators can only ban Members, not other Moderators
    if (myRole === 'Moderator' && group.members[targetUid]?.role === 'Moderator') return;

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const newMembers = { ...g.members };
      delete newMembers[targetUid];
      return {
        ...g,
        members: newMembers,
        bannedMembers: [...(g.bannedMembers ?? []), targetUid],
      };
    }));

    const batch = writeBatch(db);
    batch.delete(doc(db, 'groups', groupId, 'members', targetUid));
    batch.update(doc(db, 'groups', groupId), {
      bannedMembers: arrayUnion(targetUid),
      updatedAt: Date.now(),
    });
    await batch.commit();
  }, [user]);

  const unbanMember = useCallback(async (groupId: string, targetUid: string) => {
    if (!user) return;
    const group = groupsRef.current.find(g => g.id === groupId);
    if (!group) return;
    const myRole = group.members[user.uid]?.role;
    if (myRole !== 'Owner' && myRole !== 'Moderator') return;

    // Optimistic
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        bannedMembers: (g.bannedMembers ?? []).filter(uid => uid !== targetUid),
      };
    }));

    await updateDoc(doc(db, 'groups', groupId), {
      bannedMembers: arrayRemove(targetUid),
      updatedAt: Date.now(),
    });
  }, [user]);

  const inviteUserToGroup = useCallback(async (groupId: string, targetUid: string) => {
    if (!user || !profile) return;

    // Caller must be Owner or Moderator of the group
    const group = groupsRef.current.find(g => g.id === groupId);
    if (!group) return;
    const myRole = group.members[user.uid]?.role;
    if (myRole !== 'Owner' && myRole !== 'Moderator') return;

    // Check if target has disabled group invites
    const targetProfile = await fetchPublicProfileById(targetUid);
    if (targetProfile?.disableGroupInvites) {
      throw new Error('This user has disabled group invites.');
    }

    // Check if target is blocked — fail silently
    if (isBlocked(targetUid)) return;

    // Check if target is already a member
    if (group.members[targetUid]) return;

    // Write notification document
    await createNotification(targetUid, {
      type: 'group_invite',
      fromUid: user.uid,
      fromName: profile.displayName,
      targetId: groupId,
      targetType: 'group',
      message: `${profile.displayName} invited you to join "${group.name}"`,
      read: false,
      createdAt: Date.now(),
    });
  }, [user, profile, isBlocked]);

  const addComment = useCallback(async (
    groupId: string,
    postId: string,
    content: string,
    parentCommentId?: string,
  ) => {
    if (!user || !profile) return;
    const comment: Omit<GroupComment, 'id'> = {
      authorId: user.uid,
      authorName: profile.displayName ?? user.email ?? 'Unknown',
      content,
      createdAt: Date.now(),
      ...(parentCommentId ? { parentCommentId } : {}),
    };
    await saveGroupComment(groupId, postId, comment);
  }, [user, profile]);

  const deleteComment = useCallback(async (
    groupId: string,
    postId: string,
    commentId: string,
    authorId: string,
  ) => {
    if (!user) return;
    const group = groupsRef.current.find(g => g.id === groupId);
    const myRole = group?.members[user.uid]?.role;
    const canDelete = authorId === user.uid || myRole === 'Owner' || myRole === 'Moderator';
    if (!canDelete) return;
    await deleteGroupComment(groupId, postId, commentId);
  }, [user]);

  const reactToComment = useCallback(async (
    groupId: string,
    postId: string,
    commentId: string,
    reaction: 'paw' | 'bone' | 'heart',
    alreadyReacted: boolean,
  ) => {
    if (!user) return;
    await reactToGroupComment(groupId, postId, commentId, user.uid, reaction, alreadyReacted);
  }, [user]);

  // --- Event Posts ----------------------------------------------------------

  const createEventPost = useCallback(async (
    groupId: string,
    eventId: string,
    content: string,
  ) => {
    if (!user || !profile) return;
    // Attendance gate: only attendees can post
    const group = groupsRef.current.find(g => g.id === groupId);
    const event = group?.events.find(e => e.id === eventId);
    if (!event?.attendeeIds.includes(user.uid)) return;
    await fsCreateEventPost(
      groupId,
      eventId,
      user.uid,
      profile.displayName ?? user.email ?? 'Unknown',
      content,
    );
  }, [user, profile]);

  const deleteEventPost = useCallback(async (
    groupId: string,
    eventId: string,
    postId: string,
    authorId: string,
  ) => {
    if (!user) return;
    const group = groupsRef.current.find(g => g.id === groupId);
    const myRole = group?.members[user.uid]?.role;
    const canDelete = authorId === user.uid || myRole === 'Owner' || myRole === 'Moderator';
    if (!canDelete) return;
    await fsDeleteEventPost(groupId, eventId, postId);
  }, [user]);

  const reactToEventPost = useCallback(async (
    groupId: string,
    eventId: string,
    postId: string,
    reaction: 'paw' | 'bone' | 'heart',
    alreadyReacted: boolean,
  ) => {
    if (!user) return;
    await fsReactToEventPost(groupId, eventId, postId, user.uid, reaction, alreadyReacted);
  }, [user]);

  const loadMorePosts = useCallback(async (groupId: string) => {
    const cursor = lastPostDocRef.current[groupId] ?? undefined;
    const result = await getGroupPostsPaginated(groupId, 20, cursor);
    lastPostDocRef.current = { ...lastPostDocRef.current, [groupId]: result.lastDoc };
    setHasMorePosts(prev => ({ ...prev, [groupId]: result.hasMore }));
    if (result.posts.length === 0) return;
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const existingIds = new Set(g.posts.map(p => p.id));
      const newPosts = (result.posts as unknown as GroupPost[]).filter(p => !existingIds.has(p.id) && !isBlockedRef.current(p.authorId));
      return { ...g, posts: [...g.posts, ...newPosts] };
    }));
  }, []);

  return (
    <CommunityContext.Provider value={{
      groups,
      userPreferences,
      loading,
      hasMorePosts,
      loadMorePosts,
      createGroup,
      joinGroup,
      leaveGroup,
      toggleFavorite,
      createPost,
      pinPost,
      deletePost,
      rsvpEvent,
      createEvent,
      deleteEvent,
      updateMemberRole,
      updateGroupRetention,
      banMember,
      unbanMember,
      reactToPost,
      inviteUserToGroup,
      addComment,
      deleteComment,
      reactToComment,
      createEventPost,
      deleteEventPost,
      reactToEventPost,
    }}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error('useCommunity must be used within CommunityProvider');
  return context;
}
