import { useState, useEffect, useRef } from 'react';
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
        className="bg-surface rounded-2xl border border-outline-variant shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Friends List"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">My Friends</h2>
            <p className="text-[10px] text-on-surface-variant">{friends.length} friend{friends.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-3 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">search</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search friends…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface-container border border-outline-variant text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Friend list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
          {friends.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-4 text-center">No friends yet.</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-4 text-center">No friends match your search.</p>
          ) : (
            filtered.map(friend => {
              const initial = friend.displayName.charAt(0).toUpperCase();
              return (
                <div key={friend.uid} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shrink-0 overflow-hidden">
                    {friend.avatarUrl ? (
                      <img
                        src={friend.avatarUrl}
                        alt={friend.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                        {initial}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-on-surface truncate flex-1 min-w-0">
                    {friend.displayName}
                  </p>
                  <button
                    onClick={() => { navigate('/messages'); onClose(); }}
                    aria-label={`Message ${friend.displayName}`}
                    className="p-1 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <span className="material-symbols-outlined text-[12px]">chat</span>
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
