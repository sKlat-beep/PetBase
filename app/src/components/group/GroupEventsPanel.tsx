import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, Calendar, MapPin, Plus, Trash2, UserCheck, Repeat2, MessageSquare } from 'lucide-react';
import EventDiscussion from '../community/EventDiscussion';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { GroupEvent, CommunityRole } from '../../contexts/CommunityContext';

interface GroupEventsPanelProps {
  group: { id: string };
  upcomingEvents: GroupEvent[];
  canManageEvents: boolean;
  userRole: CommunityRole | null;
  currentUserUid: string;
  onCreateEvent: (e: React.FormEvent, form: { title: string; date: string; location: string; description: string; recurring: boolean }) => Promise<void>;
  onRsvpEvent: (groupId: string, eventId: string, going: boolean) => void;
  onDeleteEvent: (groupId: string, eventId: string) => void;
  onExpandDiscussion: (eventId: string | null) => void;
  expandedDiscussionId: string | null;
}

export function GroupEventsPanel({
  group,
  upcomingEvents,
  canManageEvents,
  userRole,
  currentUserUid,
  onCreateEvent,
  onRsvpEvent,
  onDeleteEvent,
  onExpandDiscussion,
  expandedDiscussionId,
}: GroupEventsPanelProps) {
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', date: '', location: '', description: '', recurring: false });
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ eventId: string } | null>(null);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date || eventSubmitting) return;
    setEventSubmitting(true);
    await onCreateEvent(e, eventForm);
    setEventSubmitting(false);
    setEventForm({ title: '', date: '', location: '', description: '', recurring: false });
    setShowCreateEvent(false);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-neutral-400" /> Events
          </h4>
          {canManageEvents && (
            <button
              onClick={() => setShowCreateEvent(v => !v)}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              {showCreateEvent ? 'Cancel' : 'New Event'}
            </button>
          )}
        </div>

        {/* Create Event Form */}
        <AnimatePresence>
          {showCreateEvent && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              onSubmit={handleCreateEvent}
            >
              <div className="space-y-2 pb-4 border-b border-neutral-100 dark:border-neutral-700 mb-4">
                <input
                  type="text"
                  required
                  placeholder="Event title*"
                  value={eventForm.title}
                  onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="datetime-local"
                  required
                  value={eventForm.date}
                  onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={eventForm.location}
                  onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={eventForm.description}
                  onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={eventForm.recurring}
                    onChange={e => setEventForm(f => ({ ...f, recurring: e.target.checked }))}
                    className="rounded accent-emerald-600"
                  />
                  <Repeat2 className="w-3.5 h-3.5" />
                  Recurring event
                </label>
                <button
                  type="submit"
                  disabled={!eventForm.title.trim() || !eventForm.date || eventSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  {eventSubmitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Events List */}
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-3">No upcoming events yet -- check back soon!</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(event => {
              const isAttending = currentUserUid ? event.attendeeIds.includes(currentUserUid) : false;
              return (
                <div key={event.id} className="rounded-xl border border-neutral-100 dark:border-neutral-700 p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100 leading-tight">{event.title}</p>
                    {canManageEvents && (
                      <button
                        onClick={() => setDeleteConfirm({ eventId: event.id })}
                        className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        aria-label="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {event.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    {/* Attendee avatar row + count */}
                    <div className="flex items-center gap-2">
                      {event.attendeeIds.length > 0 ? (
                        <>
                          <div className="flex -space-x-2" aria-hidden="true">
                            {event.attendeeIds.slice(0, 5).map((uid, i) => (
                              <img
                                key={uid}
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`}
                                alt=""
                                className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-700"
                                style={{ zIndex: 5 - i }}
                              />
                            ))}
                            {event.attendeeIds.length > 5 && (
                              <span
                                className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center text-[9px] font-semibold text-neutral-600 dark:text-neutral-300"
                                style={{ zIndex: 0 }}
                              >
                                +{event.attendeeIds.length - 5}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {currentUserUid && event.attendeeIds.includes(currentUserUid)
                              ? event.attendeeIds.length === 1
                                ? "You're going"
                                : `You + ${event.attendeeIds.length - 1} other${event.attendeeIds.length - 1 === 1 ? '' : 's'}`
                              : `${event.attendeeIds.length} going`}
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                          <UserCheck className="w-3 h-3" /> No RSVPs yet
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Only show Discussion toggle to group members */}
                      {userRole && (
                        <button
                          onClick={() => onExpandDiscussion(expandedDiscussionId === event.id ? null : event.id)}
                          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${expandedDiscussionId === event.id ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                          aria-expanded={expandedDiscussionId === event.id}
                        >
                          <MessageSquare className="w-3 h-3" aria-hidden="true" />
                          Discussion
                        </button>
                      )}
                      {userRole && (
                        <button
                          onClick={() => onRsvpEvent(group.id, event.id, !isAttending)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${isAttending ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                        >
                          {isAttending ? 'Going \u2713' : 'RSVP'}
                        </button>
                      )}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedDiscussionId === event.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <EventDiscussion
                          groupId={group.id}
                          eventId={event.id}
                          currentUserUid={currentUserUid}
                          attendeeIds={event.attendeeIds}
                          currentUserRole={userRole ?? 'User'}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Delete Event"
        message="Are you sure you want to delete this event? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm) {
            onDeleteEvent(group.id, deleteConfirm.eventId);
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
