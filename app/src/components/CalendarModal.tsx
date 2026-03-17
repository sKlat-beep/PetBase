import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, X } from 'lucide-react';

interface EventProps {
    id: string | number;
    title: string;
    pet: string;
    date: string;
    icon: React.ElementType;
    color: string;
    bg: string;
}

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: EventProps[];
}

export function CalendarModal({ isOpen, onClose, events }: CalendarModalProps) {
    // Prototype: We display a 90-day outlook timeline wrapping the mock events.
    // In a real implementation this would generate 90 Date objects and map events by `event.date.toDateString()`.

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="calendar-modal-title"
                        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                                    <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h2 id="calendar-modal-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">90-Day Outlook</h2>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Upcoming events & reminders</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Timeline */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {events.length === 0 ? (
                                <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No events scheduled for the next 90 days.</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-neutral-100 dark:border-neutral-700 ml-3 space-y-8 pb-4">
                                    {events.map((event, index) => (
                                        <div key={event.id} className="relative pl-6">
                                            {/* Timeline dot */}
                                            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-neutral-800 border-2 border-emerald-500" />

                                            <div className="bg-white dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex gap-4 items-start">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${event.bg} ${event.color}`}>
                                                        <event.icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 block">
                                                            {event.date}
                                                        </span>
                                                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg">
                                                            {event.title}
                                                        </h4>
                                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                            For <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.pet}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* End of 90 days marker */}
                                    <div className="relative pl-6 pt-4">
                                        <div className="absolute -left-[5px] top-6 w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                                        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 italic">End of 90-day period</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
