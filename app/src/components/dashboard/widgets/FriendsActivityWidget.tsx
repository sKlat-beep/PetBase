import React from 'react';
import { Link } from 'react-router';

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
    <section className="h-full glass-card overflow-hidden p-5" aria-label="Friends & Activity">
      <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-headline)' }}>
        <span className="material-symbols-outlined text-primary-container" aria-hidden="true">group</span> Friends &amp; Activity
      </h2>
      <div className="flex gap-4">
        {/* Left: My Friends */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">My Friends</p>
          {myFriends.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Add friends to see their activity here</p>
          ) : (
            <div className="space-y-2">
              {myFriends.map(f => (
                <Link key={f.uid} to="/community" className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-container motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {f.avatarUrl ? (
                    <img src={f.avatarUrl} alt={f.displayName} width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-container/30 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                      {f.displayName?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-on-surface truncate">{f.displayName}</p>
                    {f.pets.length > 0 && <p className="text-xs text-on-surface-variant truncate">{f.pets.map(p => `${p.count} ${p.type}`).join(', ')}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        {/* Right: Friend Activity */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Friend Activity</p>
          {friendEvents.length === 0 && myFriends.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Add friends to see their activity here</p>
          ) : friendEvents.length === 0 ? (
            <p className="text-xs text-on-surface-variant">No friend events yet</p>
          ) : (
            <div className="space-y-2 mb-3">
              {friendEvents.map(event => {
                const attendingFriend = myFriends.find(f => event.attendeeIds.includes(f.uid));
                return (
                  <div key={event.id} className="text-xs text-on-surface p-2 rounded-xl bg-surface-container/60">
                    <span className="material-symbols-outlined text-sm text-primary-container align-middle mr-1" aria-hidden="true">pets</span>
                    <span className="font-medium">{attendingFriend?.displayName ?? 'A friend'}</span>
                    {' is going to '}
                    <span className="font-medium">{event.title}</span>
                    {' — '}
                    <span className="text-on-surface-variant">{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                );
              })}
            </div>
          )}
          {sharedGroupsCount > 0 && (
            <p className="text-xs text-on-surface-variant mt-2">
              You share <span className="font-semibold text-tertiary">{sharedGroupsCount}</span> group{sharedGroupsCount !== 1 ? 's' : ''} with friends
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export const FriendsActivityWidget = React.memo(FriendsActivityWidgetInner);
