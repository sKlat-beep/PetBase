import { useState } from 'react';
import { Bell } from 'lucide-react';
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
        className="text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5">
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
