import { useMemo } from 'react';
import { Calendar, MapPin, Users, CheckCircle2 } from 'lucide-react';
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
    <section className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl border border-neutral-100 dark:border-neutral-700 p-5">
      <h2 className="font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        Events & Playdates
        {upcomingEvents.length > 0 && (
          <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">{upcomingEvents.length}</span>
        )}
      </h2>

      {/* Skeleton loading state */}
      {loading && upcomingEvents.length === 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-shrink-0 w-64 rounded-xl border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-4 animate-pulse">
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-3" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-2" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-3" />
              <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && upcomingEvents.length === 0 && (
        <div className="text-center py-6 text-neutral-400 dark:text-neutral-500">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" aria-hidden="true" />
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
                className="flex-shrink-0 w-64 rounded-xl border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-4"
              >
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                  {event.groupName}
                </span>
                <h3 className="font-medium text-neutral-800 dark:text-neutral-100 mt-2 text-sm leading-snug">{event.title}</h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>{eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span>·</span>
                  <span>{eventDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{event.attendeeIds.length} going</span>
                </div>
                <button
                  onClick={() => user && rsvpEvent(event.groupId, event.id, !isGoing)}
                  className={`mt-3 w-full text-xs py-1.5 rounded-lg font-medium transition-colors min-h-[36px] flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                    ${isGoing
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  aria-label={isGoing ? `Remove RSVP from ${event.title}` : `RSVP to ${event.title}`}
                  aria-pressed={isGoing}
                >
                  {isGoing && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
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
