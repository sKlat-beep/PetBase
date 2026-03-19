import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
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

/** Material Symbol name per notification type */
function typeIconName(type: AppNotification['type']): string {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return 'handshake';
    case 'dm_received':
      return 'chat';
    case 'group_post':
    case 'group_invite':
    case 'group_event':
      return 'groups';
    case 'event_reminder':
      return 'calendar_today';
    case 'birthday':
      return 'cake';
    case 'vaccine':
      return 'vaccines';
    case 'medication':
      return 'medication';
    case 'lost_pet':
      return 'campaign';
    case 'report_action':
      return 'warning';
    default:
      return 'notifications';
  }
}

/** M3 token-based icon circle color per notification type */
function typeIconColor(type: AppNotification['type']): { bg: string; text: string } {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container' };
    case 'dm_received':
      return { bg: 'bg-primary-container/20', text: 'text-primary' };
    case 'group_post':
    case 'group_invite':
    case 'group_event':
      return { bg: 'bg-primary-container/20', text: 'text-primary-container' };
    case 'event_reminder':
      return { bg: 'bg-secondary-container', text: 'text-on-secondary-container' };
    case 'birthday':
      return { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container' };
    case 'vaccine':
    case 'medication':
      return { bg: 'bg-secondary-container', text: 'text-on-secondary-container' };
    case 'lost_pet':
      return { bg: 'bg-error-container', text: 'text-on-error-container' };
    case 'report_action':
      return { bg: 'bg-error-container', text: 'text-on-error-container' };
    default:
      return { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' };
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
      className={`absolute ${side === 'left' ? 'left-0' : 'right-0'} top-8 w-80 max-w-[calc(100vw-1rem)] glass-morphism rounded-2xl shadow-2xl z-50 overflow-hidden`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
        <h3 className="font-bold text-on-surface text-sm">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-primary hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/20">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-on-surface-variant text-sm">
            All caught up
          </div>
        ) : (
          notifications.map(notif => {
            const iconColor = typeIconColor(notif.type);
            return (
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
                {/* Dismiss indicator behind */}
                <div className="absolute inset-y-0 right-0 w-16 bg-error/20 flex items-center justify-end pr-3 pointer-events-none">
                  <span className="material-symbols-outlined text-error text-base" aria-hidden="true">check</span>
                </div>

                <button
                  onClick={() => handleNotifClick(notif)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-surface-container-high/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                >
                  {/* Type icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconColor.bg}`}>
                    <span className={`material-symbols-outlined text-base ${iconColor.text}`} aria-hidden="true">
                      {typeIconName(notif.type)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-on-surface leading-snug">{notif.message}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{relativeTime(notif.createdAt)}</p>
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-primary-container shrink-0 mt-1.5" aria-label="Unread" />
                  )}
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
