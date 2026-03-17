import { useState, useEffect, useRef } from 'react';
import { X, Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { PublicProfile } from '../../contexts/SocialContext';

interface FriendListModalProps {
  friends: PublicProfile[];
  onClose: () => void;
}

export function FriendListModal({ friends, onClose }: FriendListModalProps) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Auto-focus search on open
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = friends.filter(f =>
    f.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Friends List"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/60 dark:border-neutral-700/60 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">My Friends</h2>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{friends.length} friend{friends.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search friends…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Friend list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
          {friends.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 py-4 text-center">No friends yet.</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 py-4 text-center">No friends match your search.</p>
          ) : (
            filtered.map(friend => {
              const initial = friend.displayName.charAt(0).toUpperCase();
              return (
                <div key={friend.uid} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {friend.avatarUrl ? (
                      <img
                        src={friend.avatarUrl}
                        alt={friend.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase">
                        {initial}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate flex-1 min-w-0">
                    {friend.displayName}
                  </p>
                  <button
                    onClick={() => { navigate('/messages'); onClose(); }}
                    aria-label={`Message ${friend.displayName}`}
                    className="p-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
