import React from 'react';
import { Link } from 'react-router';
import { Users } from 'lucide-react';

const GLASS_CARD = 'h-full bg-white/75 dark:bg-neutral-800/75 backdrop-blur-xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden';

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
    <section className={`${GLASS_CARD} p-5`} aria-label="Groups & Activity">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-violet-500" aria-hidden="true" /> Groups &amp; Activity
      </h2>
      <div className="flex gap-4 h-full">
        {/* Left: My Groups */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">My Groups</p>
          {myGroups.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">Join groups to see them here</p>
          ) : (
            <div className="space-y-2">
              {myGroups.map(g => (
                <Link key={g.id} to={`/community/groups/${g.id}`} className="flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-violet-700 dark:text-violet-300">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{g.name}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{g.memberCount} members</p>
                  </div>
                  {g.firstTag && <span className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full shrink-0 hidden sm:block">{g.firstTag}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
        {/* Right: Recent Activity */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Recent Activity</p>
          {recentPosts.length > 0 ? (
            <div className="space-y-2 mb-3">
              {recentPosts.map(post => (
                <Link key={post.id} to={`/community/groups/${post.groupId}`} className="block p-2 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{post.groupName}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{post.content.slice(0, 60)}{post.content.length > 60 ? '…' : ''}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{new Date(post.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">No recent posts</p>
          )}
          {upcomingGroupEvents.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Upcoming Events</p>
              {upcomingGroupEvents.map(event => (
                <div key={event.id} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                  <span aria-hidden="true">📅</span>
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{event.title}</span>
                    <span className="text-neutral-400 dark:text-neutral-500">{event.groupName} · {new Date(event.date).toLocaleDateString()}</span>
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
