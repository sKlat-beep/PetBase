import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../lib/firestoreService';
import type { AppNotification } from '../types/user';
import { playNotificationChime } from '../lib/notificationChime';

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());

  // Subscribe to Firestore real-time feed; clean up on user logout
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      knownIdsRef.current = new Set();
      return;
    }
    let initialLoad = true;
    const unsub = subscribeNotifications(
      user.uid,
      (notifs) => {
        if (initialLoad) {
          // Seed known IDs on first load — don't chime for existing notifications
          knownIdsRef.current = new Set(notifs.map(n => n.id));
          initialLoad = false;
        } else {
          // Detect genuinely new message notifications
          for (const n of notifs) {
            if (!knownIdsRef.current.has(n.id)) {
              knownIdsRef.current.add(n.id);
              if (n.type === 'dm_received' && localStorage.getItem('petbase-notification-sound') === 'true') {
                playNotificationChime();
              }
            }
          }
        }
        setNotifications(notifs);
      },
      (err) => console.error('notifications subscription error', err),
    );
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback((id: string) => {
    if (!user) return;
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n),
    );
    markNotificationRead(user.uid, id).catch(err =>
      console.error('markNotificationRead failed', err),
    );
  }, [user]);

  const markAllRead = useCallback(() => {
    if (!user) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllNotificationsRead(user.uid).catch(err =>
      console.error('markAllNotificationsRead failed', err),
    );
  }, [user]);

  const dismiss = useCallback((id: string) => {
    if (!user) return;
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    deleteNotification(user.uid, id).catch(err =>
      console.error('deleteNotification failed', err),
    );
  }, [user]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, dismiss }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
