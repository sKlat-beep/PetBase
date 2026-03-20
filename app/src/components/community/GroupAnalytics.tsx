import { useMemo } from 'react';
import type { CommunityGroup } from '../../contexts/CommunityContext';

interface Props {
  group: CommunityGroup;
}

export function GroupAnalytics({ group }: Props) {
  const stats = useMemo(() => {
    const memberCount = Object.keys(group.members).length;
    const postCount = group.posts.length;
    const totalReactions = group.posts.reduce((sum, p) => {
      const r = p.reactions ?? { paw: [], bone: [], heart: [] };
      return sum + r.paw.length + r.bone.length + r.heart.length;
    }, 0);
    const engagementRate = postCount > 0 ? Math.round((totalReactions / postCount) * 10) / 10 : 0;
    const eventCount = group.events.length;

    // Posts in last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentPosts = group.posts.filter(p => p.createdAt > weekAgo).length;

    // Most active members (by post count)
    const authorCounts: Record<string, { name: string; count: number }> = {};
    group.posts.forEach(p => {
      if (!authorCounts[p.authorId]) authorCounts[p.authorId] = { name: p.authorName, count: 0 };
      authorCounts[p.authorId].count++;
    });
    const topMembers = Object.values(authorCounts).sort((a, b) => b.count - a.count).slice(0, 3);

    return { memberCount, postCount, totalReactions, engagementRate, eventCount, recentPosts, topMembers };
  }, [group]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-sky-500">bar_chart</span> Group Analytics
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-sky-50 rounded-xl p-3 text-center">
          <span className="material-symbols-outlined text-[16px] text-sky-500 mx-auto mb-1">group</span>
          <p className="text-lg font-bold text-sky-700">{stats.memberCount}</p>
          <p className="text-xs text-sky-500">Members</p>
        </div>
        <div className="bg-primary-container rounded-xl p-3 text-center">
          <span className="material-symbols-outlined text-[16px] text-primary mx-auto mb-1">chat</span>
          <p className="text-lg font-bold text-on-primary-container">{stats.postCount}</p>
          <p className="text-xs text-primary">Posts</p>
        </div>
        <div className="bg-error-container rounded-xl p-3 text-center">
          <span className="material-symbols-outlined text-[16px] text-error mx-auto mb-1">favorite</span>
          <p className="text-lg font-bold text-error">{stats.totalReactions}</p>
          <p className="text-xs text-error">Reactions</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700">{stats.engagementRate}</p>
          <p className="text-xs text-amber-500">Avg Reactions/Post</p>
        </div>
      </div>

      <div className="text-xs text-on-surface-variant">
        <p>{stats.recentPosts} posts this week · {stats.eventCount} events</p>
      </div>

      {stats.topMembers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-1.5">Most Active</p>
          <div className="space-y-1">
            {stats.topMembers.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">{m.name}</span>
                <span className="text-on-surface-variant">{m.count} posts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
