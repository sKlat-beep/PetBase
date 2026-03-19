import React from 'react';

export type Reminder =
  | { type: 'vaccine'; petName: string; vaccineName: string; daysUntilDue: number }
  | { type: 'vet'; petName: string; clinic: string; when: 'today' | 'tomorrow' }
  | { type: 'medication'; petName: string; medName: string; frequency: string };

interface Props {
  reminders: Reminder[];
}

function TodayRemindersWidgetInner({ reminders }: Props) {
  return (
    <section className="h-full glass-card overflow-hidden p-5" aria-label="Today's Reminders">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
          <span className="material-symbols-outlined text-primary-container">calendar_today</span> Today's Reminders
        </h2>
      </div>
      {reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-on-surface-variant">All caught up! No reminders today</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {reminders.slice(0, 5).map((r, idx) => {
              if (r.type === 'vaccine') {
                return (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-tertiary-container/30 border border-tertiary/20">
                    <span className="material-symbols-outlined text-base shrink-0 text-tertiary" aria-hidden="true">vaccines</span>
                    <p className="text-sm text-on-surface leading-snug">
                      <span className="font-semibold">{r.petName}</span>
                      {' — '}
                      <span>{r.vaccineName}</span>
                      {' due in '}
                      <span className="font-medium text-tertiary">{r.daysUntilDue === 0 ? 'today' : `${r.daysUntilDue} day${r.daysUntilDue !== 1 ? 's' : ''}`}</span>
                    </p>
                  </div>
                );
              }
              if (r.type === 'vet') {
                return (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-secondary-container/30 border border-secondary/20">
                    <span className="material-symbols-outlined text-base shrink-0 text-secondary" aria-hidden="true">local_hospital</span>
                    <p className="text-sm text-on-surface leading-snug">
                      <span className="font-semibold">{r.petName}</span>
                      {' — vet appointment '}
                      <span className="font-medium text-secondary">{r.when}</span>
                      {r.clinic && r.clinic !== 'Vet' && <span className="text-on-surface-variant"> at {r.clinic}</span>}
                    </p>
                  </div>
                );
              }
              if (r.type === 'medication') {
                return (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-primary-container/10 border border-primary/20">
                    <span className="material-symbols-outlined text-base shrink-0 text-primary" aria-hidden="true">medication</span>
                    <p className="text-sm text-on-surface leading-snug">
                      <span className="font-semibold">{r.petName}</span>
                      {' — '}
                      <span>{r.medName}</span>
                      {r.frequency && <span className="text-on-surface-variant"> ({r.frequency})</span>}
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
          {reminders.length > 5 && (
            <p className="text-xs text-on-surface-variant text-center mt-2">
              +{reminders.length - 5} more reminder{reminders.length - 5 !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export const TodayRemindersWidget = React.memo(TodayRemindersWidgetInner);
