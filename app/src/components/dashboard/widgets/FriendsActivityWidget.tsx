import React from 'react';
import { Link } from 'react-router';
import { Users } from 'lucide-react';

const GLASS_CARD = 'h-full bg-white/75 dark:bg-neutral-800/75 backdrop-blur-xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden';

interface FriendSummary {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  pets: { type: string; count: number }[];
}

interface FriendEvent {
  id: string;
  title: string;
  date: string;
  groupName: string;
  attendeeIds: string[];
}

interface Props {
  myFriends: FriendSummary[];
  friendEvents: FriendEvent[];
  sharedGroupsCount: number;
}

function FriendsActivityWidgetInner({ myFriends, friendEvents, sharedGroupsCount }: Props) {
  return (
    <section className={`${GLASS_CARD} p-5`} aria-label="Friends & Activity">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-pink-500" aria-hidden="true" /> Friends &amp; Activity
      </h2>
      <div className="flex gap-4">
        {/* Left: My Friends */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">My Friends</p>
          {myFriends.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">Add friends to see their activity here</p>
          ) : (
            <div className="space-y-2">
              {myFriends.map(f => (
                <Link key={f.uid} to="/community" className="flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                  {f.avatarUrl ? (
                    <img src={f.avatarUrl} alt={f.displayName} width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-pink-700 dark:text-pink-300">
                      {f.displayName?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{f.displayName}</p>
                    {f.pets.length > 0 && <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{f.pets.map(p => `${p.count} ${p.type}`).join(', ')}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        {/* Right: Friend Activity */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Friend Activity</p>
          {friendEvents.length === 0 && myFriends.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">Add friends to see their activity here</p>
          ) : friendEvents.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">No friend events yet</p>
          ) : (
            <div className="space-y-2 mb-3">
              {friendEvents.map(event => {
                const attendingFriend = myFriends.find(f => event.attendeeIds.includes(f.uid));
                return (
                  <div key={event.id} className="text-xs text-neutral-600 dark:text-neutral-300 p-2 rounded-xl bg-neutral-50/80 dark:bg-neutral-700/40">
                    <span aria-hidden="true">🐾 </span>
                    <span className="font-medium">{attendingFriend?.displayName ?? 'A friend'}</span>
                    {' is going to '}
                    <span className="font-medium">{event.title}</span>
                    {' — '}
                    <span className="text-neutral-400">{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                );
              })}
            </div>
          )}
          {sharedGroupsCount > 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              You share <span className="font-semibold text-violet-600 dark:text-violet-400">{sharedGroupsCount}</span> group{sharedGroupsCount !== 1 ? 's' : ''} with friends
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export const FriendsActivityWidget = React.memo(FriendsActivityWidgetInner);
