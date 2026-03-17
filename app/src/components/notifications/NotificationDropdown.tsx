import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { HandshakeIcon, MessageSquare, Users, CalendarDays, AlertTriangle, Cake, Syringe, Pill, Megaphone } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationsContext';
import type { AppNotification } from '../../types/user';

interface Props {
  onClose: () => void;
  /** 'left' anchors left edge to button (sidebar); 'right' anchors right edge (mobile header). */
  side?: 'left' | 'right';
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function typeIcon(type: AppNotification['type']) {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return <HandshakeIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case 'dm_received':
      return <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case 'group_post':
    case 'group_invite':
    case 'group_event':
      return <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />;
    case 'event_reminder':
      return <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'birthday':
      return <Cake className="w-4 h-4 text-pink-600 dark:text-pink-400" />;
    case 'vaccine':
      return <Syringe className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case 'medication':
      return <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
    case 'lost_pet':
      return <Megaphone className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    case 'report_action':
      return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-stone-400" />;
  }
}

function typeIconBg(type: AppNotification['type']) {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return 'bg-emerald-100 dark:bg-emerald-900/30';
    case 'dm_received':
      return 'bg-blue-100 dark:bg-blue-900/30';
    case 'group_post':
    case 'group_invite':
    case 'group_event':
      return 'bg-violet-100 dark:bg-violet-900/30';
    case 'event_reminder':
      return 'bg-amber-100 dark:bg-amber-900/30';
    case 'birthday':
      return 'bg-pink-100 dark:bg-pink-900/30';
    case 'vaccine':
      return 'bg-sky-100 dark:bg-sky-900/30';
    case 'medication':
      return 'bg-teal-100 dark:bg-teal-900/30';
    case 'lost_pet':
      return 'bg-orange-100 dark:bg-orange-900/30';
    case 'report_action':
      return 'bg-rose-100 dark:bg-rose-900/30';
    default:
      return 'bg-stone-100 dark:bg-zinc-700';
  }
}

function navPath(notif: AppNotification): string | null {
  switch (notif.type) {
    case 'dm_received':
      return '/messages';
    case 'friend_request':
      return '/community/people';
    case 'group_invite':
    case 'group_post':
    case 'group_event':
      return '/community';
    case 'birthday':
    case 'vaccine':
    case 'medication':
      return '/pets';
    default:
      return null;
  }
}

export function NotificationDropdown({ onClose, side = 'right' }: Props) {
  const { notifications, unreadCount, markRead, markAllRead, dismiss } = useNotifications();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  function handleNotifClick(notif: AppNotification) {
    markRead(notif.id);
    const path = navPath(notif);
    if (path) {
      navigate(path);
      onClose();
    }
  }

  return (
    <div
      ref={ref}
      className={`absolute ${side === 'left' ? 'left-0' : 'right-0'} top-8 w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-zinc-700 z-50 overflow-hidden`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-zinc-700 flex items-center justify-between">
        <h3 className="font-bold text-stone-900 dark:text-zinc-100 text-sm">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-zinc-700">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-stone-400 dark:text-zinc-500 text-sm">
            All caught up 🐾
          </div>
        ) : (
          notifications.map(notif => (
            <motion.div
              key={notif.id}
              drag="x"
              dragConstraints={{ left: -200, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -120) {
                  dismiss(notif.id);
                }
              }}
              className="touch-pan-y relative overflow-hidden"
            >
              {/* Red dismiss indicator behind */}
              <div className="absolute inset-y-0 right-0 w-16 bg-rose-500/20 flex items-center justify-end pr-3 pointer-events-none">
                <span className="text-xs text-rose-500">✓</span>
              </div>

              <button
                onClick={() => handleNotifClick(notif)}
                className="w-full flex items-start gap-3 p-3 hover:bg-stone-50 dark:hover:bg-zinc-700/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                {/* Type icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${typeIconBg(notif.type)}`}>
                  {typeIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-900 dark:text-zinc-100 leading-snug">{notif.message}</p>
                  <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">{relativeTime(notif.createdAt)}</p>
                </div>

                {/* Unread dot */}
                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" aria-label="Unread" />
                )}
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
