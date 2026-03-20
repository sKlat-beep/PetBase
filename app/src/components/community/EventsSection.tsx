import { useMemo } from 'react';
import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';

export default function EventsSection() {
  const { groups, rsvpEvent, loading } = useCommunity();
  const { user } = useAuth();

  const upcomingEvents = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // allow events up to 24h past
    return groups
      .filter(g => user && g.members[user.uid])
      .flatMap(g => g.events.map(e => ({ ...e, groupId: g.id, groupName: g.name })))
      .filter(e => new Date(e.date).getTime() > cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  }, [groups, user]);

  return (
    <section className="bg-surface-container-low backdrop-blur-sm rounded-2xl border border-outline-variant p-5">
      <h2 className="font-semibold text-on-surface flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">event</span>
        Events & Playdates
        {upcomingEvents.length > 0 && (
          <span className="text-xs font-normal text-on-surface-variant">{upcomingEvents.length}</span>
        )}
      </h2>

      {/* Skeleton loading state */}
      {loading && upcomingEvents.length === 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-shrink-0 w-64 rounded-xl border border-outline-variant bg-surface-container p-4 animate-pulse">
              <div className="h-3 bg-surface-container-highest rounded w-1/3 mb-3" />
              <div className="h-4 bg-surface-container-highest rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-container-highest rounded w-1/2 mb-2" />
              <div className="h-3 bg-surface-container-highest rounded w-2/3 mb-3" />
              <div className="h-8 bg-surface-container-highest rounded-lg w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && upcomingEvents.length === 0 && (
        <div className="text-center py-6 text-on-surface-variant">
          <span className="material-symbols-outlined text-[40px] mx-auto mb-2 opacity-40" aria-hidden="true">event</span>
          <p className="text-sm">No upcoming events from your groups.</p>
          <p className="text-xs mt-1">Join a group or create an event to get started.</p>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {upcomingEvents.map(event => {
            const isGoing = user ? event.attendeeIds.includes(user.uid) : false;
            const eventDate = new Date(event.date);
            return (
              <div
                key={event.id}
                className="flex-shrink-0 w-64 rounded-xl border border-outline-variant bg-surface-container p-4"
              >
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-medium">
                  {event.groupName}
                </span>
                <h3 className="font-medium text-on-surface mt-2 text-sm leading-snug">{event.title}</h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px] flex-shrink-0" aria-hidden="true">event</span>
                  <span>{eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span>·</span>
                  <span>{eventDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px] flex-shrink-0" aria-hidden="true">location_on</span>
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">group</span>
                  <span>{event.attendeeIds.length} going</span>
                </div>
                <button
                  onClick={() => user && rsvpEvent(event.groupId, event.id, !isGoing)}
                  className={`mt-3 w-full text-xs py-1.5 rounded-lg font-medium transition-colors min-h-[36px] flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                    ${isGoing
                      ? 'bg-primary-container text-on-primary-container hover:bg-primary-container/80'
                      : 'bg-primary text-on-primary hover:bg-primary/90'
                    }`}
                  aria-label={isGoing ? `Remove RSVP from ${event.title}` : `RSVP to ${event.title}`}
                  aria-pressed={isGoing}
                >
                  {isGoing && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>}
                  {isGoing ? 'Going ✓' : 'RSVP'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
