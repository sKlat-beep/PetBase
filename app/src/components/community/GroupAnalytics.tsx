import { useMemo } from 'react';
import { BarChart3, Users, MessageSquare, Heart } from 'lucide-react';
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
      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-sky-500" /> Group Analytics
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl p-3 text-center">
          <Users className="w-4 h-4 text-sky-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-sky-700 dark:text-sky-300">{stats.memberCount}</p>
          <p className="text-[10px] text-sky-500">Members</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 text-center">
          <MessageSquare className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{stats.postCount}</p>
          <p className="text-[10px] text-emerald-500">Posts</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3 text-center">
          <Heart className="w-4 h-4 text-rose-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{stats.totalReactions}</p>
          <p className="text-[10px] text-rose-500">Reactions</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{stats.engagementRate}</p>
          <p className="text-[10px] text-amber-500">Avg Reactions/Post</p>
        </div>
      </div>

      <div className="text-xs text-stone-500 dark:text-stone-400">
        <p>{stats.recentPosts} posts this week · {stats.eventCount} events</p>
      </div>

      {stats.topMembers.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wide mb-1.5">Most Active</p>
          <div className="space-y-1">
            {stats.topMembers.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-stone-700 dark:text-stone-300">{m.name}</span>
                <span className="text-stone-400">{m.count} posts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
