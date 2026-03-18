import React from 'react';
import { Calendar } from 'lucide-react';

const GLASS_CARD = 'h-full bg-white/75 dark:bg-neutral-800/75 backdrop-blur-xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden';

export type Reminder =
  | { type: 'vaccine'; petName: string; vaccineName: string; daysUntilDue: number }
  | { type: 'vet'; petName: string; clinic: string; when: 'today' | 'tomorrow' }
  | { type: 'medication'; petName: string; medName: string; frequency: string };

interface Props {
  reminders: Reminder[];
}

function TodayRemindersWidgetInner({ reminders }: Props) {
  return (
    <section className={`${GLASS_CARD} p-5`} aria-label="Today's Reminders">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-500" aria-hidden="true" /> Today's Reminders
        </h2>
      </div>
      {reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">All caught up! No reminders today 🎉</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {reminders.slice(0, 5).map((r, idx) => {
              if (r.type === 'vaccine') {
                return (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                    <span className="text-base shrink-0" aria-hidden="true">💉</span>
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">
                      <span className="font-semibold">{r.petName}</span>
                      {' — '}
                      <span>{r.vaccineName}</span>
                      {' due in '}
                      <span className="font-medium text-amber-700 dark:text-amber-400">{r.daysUntilDue === 0 ? 'today' : `${r.daysUntilDue} day${r.daysUntilDue !== 1 ? 's' : ''}`}</span>
                    </p>
                  </div>
                );
              }
              if (r.type === 'vet') {
                return (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/40">
                    <span className="text-base shrink-0" aria-hidden="true">🏥</span>
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">
                      <span className="font-semibold">{r.petName}</span>
                      {' — vet appointment '}
                      <span className="font-medium text-sky-700 dark:text-sky-400">{r.when}</span>
                      {r.clinic && r.clinic !== 'Vet' && <span className="text-neutral-500 dark:text-neutral-400"> at {r.clinic}</span>}
                    </p>
                  </div>
                );
              }
              if (r.type === 'medication') {
                return (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/40">
                    <span className="text-base shrink-0" aria-hidden="true">💊</span>
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">
                      <span className="font-semibold">{r.petName}</span>
                      {' — '}
                      <span>{r.medName}</span>
                      {r.frequency && <span className="text-neutral-500 dark:text-neutral-400"> ({r.frequency})</span>}
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
          {reminders.length > 5 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center mt-2">
              +{reminders.length - 5} more reminder{reminders.length - 5 !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export const TodayRemindersWidget = React.memo(TodayRemindersWidgetInner);
