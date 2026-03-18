import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSocial } from './SocialContext';
import {
  sendDm,
  markDmRead,
  deleteDmForUser,
  editDmMessage,
  subscribeToConversations,
  subscribeToThread,
  createNotification,
  fetchPublicProfileById,
  setTyping,
  subscribeTyping,
  type DmMessage,
} from '../lib/firestoreService';
import { playNotificationChime } from '../lib/notificationChime';

export interface Conversation {
  threadId: string;
  otherUid: string;
  lastMessage: DmMessage;
}

interface MessagingContextValue {
  conversations: Conversation[];
  threadMessages: DmMessage[];
  activeUid: string | null;
  setActiveUid: (uid: string | null) => void;
  sendMessage: (toUid: string, content: string, media?: { url: string; type: 'image' | 'gif' | 'audio' }, replyTo?: { id: string; content: string; fromUid: string }) => Promise<void>;
  deleteMessage: (messageId: string, fromUid: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  markRead: (messageId: string) => Promise<void>;
  unreadByUser: Record<string, number>;
  totalUnread: number;
  otherUserTyping: boolean;
  notifyTyping: () => void;
  pinnedThreadIds: string[];
  togglePin: (threadId: string) => void;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { isBlocked } = useSocial();
  const isBlockedRef = useRef(isBlocked);
  useEffect(() => { isBlockedRef.current = isBlocked; }, [isBlocked]);
  const activeUidRef = useRef<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [threadMessages, setThreadMessages] = useState<DmMessage[]>([]);
  const threadMessagesRef = useRef<DmMessage[]>([]);
  const [activeUid, setActiveUidState] = useState<string | null>(null);
  const threadUnsubRef = useRef<(() => void) | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingUnsubRef = useRef<(() => void) | null>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to all conversations — filter out blocked users
  useEffect(() => {
    if (!user) {
      setConversations([]);
      threadUnsubRef.current?.();
      threadUnsubRef.current = null;
      typingUnsubRef.current?.();
      typingUnsubRef.current = null;
      setOtherUserTyping(false);
      return;
    }
    const unsub = subscribeToConversations(
      user.uid,
      (convos) => {
        setConversations(convos.filter(conv => !isBlockedRef.current(conv.otherUid)));
      },
      () => { /* silent — conversations stay stale */ },
    );
    return unsub;
  }, [user]); // No isBlocked in deps — use ref instead

  // Subscribe to active thread when activeUid changes
  const setActiveUid = useCallback((uid: string | null) => {
    threadUnsubRef.current?.();
    threadUnsubRef.current = null;
    typingUnsubRef.current?.();
    typingUnsubRef.current = null;
    setThreadMessages([]);
    threadMessagesRef.current = [];
    setOtherUserTyping(false);
    setActiveUidState(uid);
    activeUidRef.current = uid;

    if (!uid || !user) return;
    const currentUid = user.uid;
    threadUnsubRef.current = subscribeToThread(
      currentUid,
      uid,
      (msgs) => {
        const prev = threadMessagesRef.current;
        // Detect newly arrived messages from the other user
        if (prev.length > 0 && msgs.length > prev.length) {
          const prevIds = new Set(prev.map(m => m.id));
          const newIncoming = msgs.filter(
            m => !prevIds.has(m.id) && m.fromUid !== currentUid,
          );
          if (newIncoming.length > 0 && localStorage.getItem('petbase-sound') === '1') {
            playNotificationChime();
          }
        }
        threadMessagesRef.current = msgs;
        setThreadMessages(msgs);
      },
      () => { /* silent */ },
    );
    const threadId = [user.uid, uid].sort().join('_');
    typingUnsubRef.current = subscribeTyping(threadId, uid, setOtherUserTyping);
  }, [user]);

  // Cleanup thread + typing subscriptions on unmount
  useEffect(() => () => {
    threadUnsubRef.current?.();
    typingUnsubRef.current?.();
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
  }, []);

  const sendMessage = useCallback(async (toUid: string, content: string, media?: { url: string; type: 'image' | 'gif' }, replyTo?: { id: string; content: string; fromUid: string }) => {
    if (!user) return;
    if (isBlockedRef.current(toUid)) throw new Error('Cannot send message to a blocked user');
    await sendDm(user.uid, toUid, content, media, replyTo);
    // Best-effort: skip notification if we are actively in this conversation
    // (complete server-side de-dup deferred to Phase 3c)
    if (activeUidRef.current !== toUid && profile) {
      // Only send DM notification if recipient has not opted out
      fetchPublicProfileById(toUid)
        .then(recipientProfile => {
          if (!recipientProfile?.disableDMs) {
            createNotification(toUid, {
              type: 'dm_received',
              fromUid: user.uid,
              fromName: profile.displayName,
              message: `New message from ${profile.displayName}`,
              read: false,
              createdAt: Date.now(),
            }).catch(() => {});
          }
        })
        .catch(() => {/* non-critical */});
    }
  }, [user, profile]);

  const deleteMessage = useCallback(async (messageId: string, fromUid: string) => {
    if (!user) return;
    await deleteDmForUser(messageId, user.uid, fromUid);
  }, [user]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user) return;
    await editDmMessage(messageId, user.uid, newContent);
  }, [user]);

  const markRead = useCallback(async (messageId: string) => {
    await markDmRead(messageId);
  }, []);

  // Debounced typing indicator: sets isTyping=true on keystroke, false after 3s idle
  const notifyTyping = useCallback(() => {
    const uid = user?.uid;
    const otherUid = activeUidRef.current;
    if (!uid || !otherUid) return;
    const threadId = [uid, otherUid].sort().join('_');
    setTyping(threadId, uid, true).catch(() => {});
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    typingIdleRef.current = setTimeout(() => {
      setTyping(threadId, uid, false).catch(() => {});
    }, 3000);
  }, [user]);

  const unreadByUser: Record<string, number> = {};
  if (user) {
    conversations.forEach(c => {
      const unread = c.lastMessage.toUid === user.uid && !c.lastMessage.read ? 1 : 0;
      if (unread > 0) unreadByUser[c.otherUid] = (unreadByUser[c.otherUid] ?? 0) + unread;
    });
  }
  const totalUnread = Object.values(unreadByUser).reduce((a, b) => a + b, 0);

  // Pinned conversations
  const pinnedThreadIds = profile?.pinnedConversations ?? [];
  const togglePin = useCallback((threadId: string) => {
    if (!user || !profile) return;
    const current = profile.pinnedConversations ?? [];
    const next = current.includes(threadId)
      ? current.filter(id => id !== threadId)
      : [...current, threadId];
    // Persist via AuthContext's updateProfile (writes to Firestore + local)
    import('../lib/firestoreService').then(({ updateProfile }) =>
      updateProfile(user.uid, { pinnedConversations: next } as any).catch(() => {})
    );
  }, [user, profile]);

  // Sort conversations: pinned first
  const sortedConversations = useMemo(() => {
    const pinSet = new Set(pinnedThreadIds);
    return [...conversations].sort((a, b) => {
      const aPinned = pinSet.has(a.threadId) ? 1 : 0;
      const bPinned = pinSet.has(b.threadId) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0);
    });
  }, [conversations, pinnedThreadIds]);

  return (
    <MessagingContext.Provider value={{
      conversations: sortedConversations,
      threadMessages,
      activeUid,
      setActiveUid,
      sendMessage,
      deleteMessage,
      editMessage,
      markRead,
      unreadByUser,
      totalUnread,
      otherUserTyping,
      notifyTyping,
      pinnedThreadIds,
      togglePin,
    }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within MessagingProvider');
  return ctx;
}
