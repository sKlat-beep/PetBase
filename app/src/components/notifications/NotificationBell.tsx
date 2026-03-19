import { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { NotificationDropdown } from './NotificationDropdown';

interface Props {
  /** 'left' opens dropdown rightward (sidebar); 'right' opens leftward (mobile header). */
  side?: 'left' | 'right';
}

export function NotificationBell({ side = 'right' }: Props) {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(o => !o); }}
        className="text-on-surface-variant hover:text-on-surface transition-colors relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] bg-error rounded-full text-on-error text-[10px] font-bold flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <NotificationDropdown
          side={side}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
