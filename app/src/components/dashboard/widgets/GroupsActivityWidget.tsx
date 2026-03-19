import React from 'react';
import { Link } from 'react-router';

interface GroupSummary {
  id: string;
  name: string;
  memberCount: number;
  firstTag?: string;
}

interface PostSummary {
  id: string;
  groupName: string;
  groupId: string;
  content: string;
  createdAt: number;
}

interface EventSummary {
  id: string;
  title: string;
  groupName: string;
  date: string;
}

interface Props {
  myGroups: GroupSummary[];
  recentPosts: PostSummary[];
  upcomingGroupEvents: EventSummary[];
}

function GroupsActivityWidgetInner({ myGroups, recentPosts, upcomingGroupEvents }: Props) {
  return (
    <section className="h-full glass-card overflow-hidden p-5" aria-label="Groups & Activity">
      <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-headline)' }}>
        <span className="material-symbols-outlined text-tertiary" aria-hidden="true">groups</span> Groups &amp; Activity
      </h2>
      <div className="flex gap-4 h-full">
        {/* Left: My Groups */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">My Groups</p>
          {myGroups.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Join groups to see them here</p>
          ) : (
            <div className="space-y-2">
              {myGroups.map(g => (
                <Link key={g.id} to={`/community/groups/${g.id}`} className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-container motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <div className="w-8 h-8 rounded-xl bg-tertiary-container flex items-center justify-center shrink-0 text-xs font-bold text-on-tertiary-container">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-on-surface truncate">{g.name}</p>
                    <p className="text-xs text-on-surface-variant">{g.memberCount} members</p>
                  </div>
                  {g.firstTag && <span className="text-xs bg-tertiary-container/30 text-tertiary px-1.5 py-0.5 rounded-full shrink-0 hidden sm:block">{g.firstTag}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
        {/* Right: Recent Activity */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Recent Activity</p>
          {recentPosts.length > 0 ? (
            <div className="space-y-2 mb-3">
              {recentPosts.map(post => (
                <Link key={post.id} to={`/community/groups/${post.groupId}`} className="block p-2 rounded-xl hover:bg-surface-container motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <p className="text-xs font-medium text-on-surface truncate">{post.groupName}</p>
                  <p className="text-xs text-on-surface-variant truncate">{post.content.slice(0, 60)}{post.content.length > 60 ? '…' : ''}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">{new Date(post.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant mb-3">No recent posts</p>
          )}
          {upcomingGroupEvents.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Upcoming Events</p>
              {upcomingGroupEvents.map(event => (
                <div key={event.id} className="flex items-start gap-1.5 text-xs text-on-surface">
                  <span className="material-symbols-outlined text-sm text-secondary" aria-hidden="true">event</span>
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{event.title}</span>
                    <span className="text-on-surface-variant">{event.groupName} · {new Date(event.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export const GroupsActivityWidget = React.memo(GroupsActivityWidgetInner);
