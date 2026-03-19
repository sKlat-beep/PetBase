import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useCommunity, type GroupMember } from '../../contexts/CommunityContext';
import { CollapsiblePanelWidget } from '../layout/CollapsiblePanelWidget';
import { GroupMemberModal } from './GroupMemberModal';

export function GroupHubPanel() {
  const { groupId } = useParams<{ groupId: string }>();
  const { groups, rsvpEvent } = useCommunity();
  const { user } = useAuth();

  const group = groups.find(g => g.id === groupId);

  const [descExpanded, setDescExpanded] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const roleCounts = useMemo(() => {
    if (!group) return { Owner: 0, Moderator: 0, Member: 0 };
    const counts = { Owner: 0, Moderator: 0, Member: 0 };
    (Object.values(group.members) as GroupMember[]).forEach(m => {
      if (m.role === 'Owner') counts.Owner++;
      else if (m.role === 'Moderator') counts.Moderator++;
      else counts.Member++;
    });
    return counts;
  }, [group]);

  const upcomingEvents = useMemo(() => {
    if (!group) return [];
    const now = new Date();
    return [...group.events]
      .filter(e => new Date(e.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [group]);

  if (!group || !groupId) return null;

  const memberCount = Object.keys(group.members).length;
  const postCount = group.posts.length;
  const isLongDesc = group.description.length > 100;

  // Build role breakdown string — only include non-zero counts
  const roleBreakdownParts: string[] = [];
  if (roleCounts.Owner > 0) roleBreakdownParts.push(`${roleCounts.Owner} Owner${roleCounts.Owner !== 1 ? 's' : ''}`);
  if (roleCounts.Moderator > 0) roleBreakdownParts.push(`${roleCounts.Moderator} Moderator${roleCounts.Moderator !== 1 ? 's' : ''}`);
  if (roleCounts.Member > 0) roleBreakdownParts.push(`${roleCounts.Member} Member${roleCounts.Member !== 1 ? 's' : ''}`);
  const roleBreakdown = roleBreakdownParts.join(' · ');

  return (
    <div className="space-y-3">
      {/* Section 1: About This Group */}
      <CollapsiblePanelWidget
        id={`group-about-${groupId}`}
        title="About This Group"
        icon={<span className="material-symbols-outlined text-[12px]">info</span>}
      >
        <div className="space-y-2.5">
          <div>
            <p className={`text-xs text-on-surface-variant ${!descExpanded && isLongDesc ? 'line-clamp-4' : ''}`}>
              {group.description}
            </p>
            {isLongDesc && (
              <button
                onClick={() => setDescExpanded(v => !v)}
                className="text-[10px] text-primary hover:underline mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
              >
                {descExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {group.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {group.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="text-[10px] text-on-surface-variant space-y-0.5">
            <p>Created {new Date(group.createdAt).toLocaleDateString()}</p>
            <p>{memberCount} member{memberCount !== 1 ? 's' : ''} · {postCount} post{postCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </CollapsiblePanelWidget>

      {/* Section 2: Upcoming Events */}
      <CollapsiblePanelWidget
        id={`group-events-${groupId}`}
        title="Upcoming Events"
        icon={<span className="material-symbols-outlined text-[12px]">event</span>}
      >
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-on-surface-variant">No upcoming events</p>
        ) : (
          <div className="space-y-2.5">
            {upcomingEvents.map(e => {
              const isAttending = user ? e.attendeeIds.includes(user.uid) : false;
              return (
                <div key={e.id} className="space-y-1.5">
                  <p className="text-xs font-semibold text-on-surface leading-tight">{e.title}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    {new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}{e.attendeeIds.length} going
                  </p>
                  {user && (
                    <button
                      onClick={() => rsvpEvent(group.id, e.id, !isAttending)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                        isAttending
                          ? 'bg-primary-container text-on-primary-container hover:bg-primary-container/80'
                          : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {isAttending ? 'Going ✓' : 'RSVP'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsiblePanelWidget>

      {/* Section 3: Members */}
      <CollapsiblePanelWidget
        id={`group-members-${groupId}`}
        title="Members"
        icon={<span className="material-symbols-outlined text-[12px]">group</span>}
      >
        <div className="space-y-2.5">
          {roleBreakdown && (
            <p className="text-[10px] text-on-surface-variant">{roleBreakdown}</p>
          )}
          <button
            onClick={() => setShowMemberModal(true)}
            className="text-[10px] font-semibold text-sky-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
          >
            View all {memberCount} member{memberCount !== 1 ? 's' : ''} →
          </button>
        </div>
      </CollapsiblePanelWidget>

      {showMemberModal && group && (
        <GroupMemberModal
          members={group.members}
          onClose={() => setShowMemberModal(false)}
          userRole={user ? group.members[user.uid]?.role ?? null : null}
          groupId={group.id}
        />
      )}
    </div>
  );
}
