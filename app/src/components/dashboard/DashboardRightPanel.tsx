import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { getActiveLostPets, type LostPetAlert } from '../../utils/lostPetsApi';
import { LostPetBanner } from '../LostPetBanner';
import { CollapsiblePanelWidget } from '../layout/CollapsiblePanelWidget';
import { useSafetyAlerts, CATEGORY_COLORS, CATEGORY_LABELS } from '../../contexts/SafetyAlertsContext';
import { useWeather } from '../../hooks/useWeather';

// ─── Material Symbol helper ──────────────────────────────────────────────────

function MIcon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>;
}

// ─── Quick action definitions ────────────────────────────────────────────────

const QUICK_ACTIONS: { label: string; icon: string; to: string; colorClass: string }[] = [
  { label: 'Add Pet', icon: 'pets', to: '/pets', colorClass: 'bg-primary-container text-on-primary-container' },
  { label: 'Create Card', icon: 'qr_code_2', to: '/pets?openCards=true', colorClass: 'bg-tertiary-container text-on-tertiary-container' },
  { label: 'Find Vet', icon: 'local_hospital', to: '/services', colorClass: 'bg-secondary-container text-on-secondary-container' },
  { label: 'Report Lost', icon: 'emergency', to: '/lost-pets', colorClass: 'bg-error-container text-on-error-container' },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DashboardRightPanelProps {
  onCalendar: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DashboardRightPanel({ onCalendar }: DashboardRightPanelProps) {
  const { profile } = useAuth();
  const { pets } = usePets();
  const { groups } = useCommunity();

  // Safety alerts
  const { alerts: safetyAlerts } = useSafetyAlerts();
  const SEEN_KEY = 'petbase-alerts-seen-at';
  const [seenAt] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(SEEN_KEY) ?? '0', 10) || 0; } catch { return 0; }
  });
  const unseenCount = safetyAlerts.filter(a => a.createdAt > seenAt).length;
  const markAlertsSeen = () => {
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
  };

  // Weather (debounced via shared hook)
  const { weather, loading: weatherLoading } = useWeather(profile?.zipCode);

  // Lost pet
  const [lostPet, setLostPet] = useState<LostPetAlert | null>(null);

  useEffect(() => {
    if (!profile?.zipCode) return;
    getActiveLostPets(profile.zipCode).then(res => {
      if (res.length > 0) setLostPet(res[0]);
    });
  }, [profile?.zipCode]);

  // Upcoming events (RSVP'd)
  const { user } = useAuth();
  const upcomingEvents = useMemo(() => {
    if (!user) return [];
    return groups
      .flatMap(g => g.events.map(e => ({ ...e, groupName: g.name })))
      .filter(e => e.attendeeIds.includes(user.uid) && new Date(e.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [user, groups]);

  // Pet of the Day
  const featuredPet = useMemo(() => {
    if (pets.length === 0) return null;
    const idx = Math.floor(Date.now() / 86400000) % pets.length;
    return pets[idx];
  }, [pets]);

  // Mini calendar state
  const [calDate, setCalDate] = useState(() => new Date());
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return groups
      .flatMap(g => g.events.map(e => ({ ...e, groupName: g.name })))
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === selectedDay;
      });
  }, [selectedDay, groups, calYear, calMonth]);

  // Events this month (for dots)
  const monthEvents = useMemo(() => {
    if (!user) return new Map<number, number>();
    const evMap = new Map<number, number>();
    groups
      .flatMap(g => g.events)
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      })
      .forEach(e => {
        const day = new Date(e.date).getDate();
        evMap.set(day, (evMap.get(day) || 0) + 1);
      });
    return evMap;
  }, [user, groups, calYear, calMonth]);

  const prevMonth = () => { setCalDate(new Date(calYear, calMonth - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCalDate(new Date(calYear, calMonth + 1, 1)); setSelectedDay(null); };

  const monthLabel = calDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <>
      {/* 1. Quick Actions — 2x2 grid */}
      <CollapsiblePanelWidget id="dash-quick-actions" title="Quick Actions" icon={<MIcon name="bolt" className="text-[14px]" />}>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map(qa => (
            <Link
              key={qa.label}
              to={qa.to}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl ${qa.colorClass} hover:brightness-110 motion-safe:transition-all min-h-[72px] text-center`}
            >
              <MIcon name={qa.icon} className="text-[24px]" />
              <span className="text-xs font-medium">{qa.label}</span>
            </Link>
          ))}
        </div>
      </CollapsiblePanelWidget>

      {/* 2. Lost Pet Alert — only when active */}
      {lostPet && (
        <CollapsiblePanelWidget id="dash-lost-pet" title="Lost Pet Alert" icon={<MIcon name="shield" className="text-[14px]" />}>
          <LostPetBanner lostPet={lostPet} />
        </CollapsiblePanelWidget>
      )}

      {/* 3. Safety Alerts — collapsed by default */}
      <CollapsiblePanelWidget
        id="dash-safety-alerts"
        title="Safety Alerts"
        icon={<MIcon name="warning" className="text-[14px] text-error" />}
        defaultExpanded={false}
        badge={unseenCount > 0 ? (
          <span className="ml-auto mr-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-xs font-bold flex items-center justify-center">
            {unseenCount}
          </span>
        ) : undefined}
      >
        <div onClick={markAlertsSeen}>
          {safetyAlerts.length === 0 ? (
            <p className="text-xs text-on-surface-variant/60">No safety alerts in your area.</p>
          ) : (
            <div className="space-y-2">
              {safetyAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-surface-container border border-outline-variant/30">
                  <MIcon
                    name="warning"
                    className={`text-[16px] mt-0.5 shrink-0 ${alert.severity === 'high' ? 'text-error' : alert.severity === 'medium' ? 'text-primary' : 'text-secondary'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-on-surface truncate">{alert.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLORS[alert.category]}`}>
                        {CATEGORY_LABELS[alert.category]}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsiblePanelWidget>

      {/* 4. Weather — only when data available */}
      {!weatherLoading && weather && (
        <CollapsiblePanelWidget id="dash-weather" title="Weather" icon={<MIcon name="location_on" className="text-[14px]" />}>
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none" role="img" aria-label={weather.condition}>{weather.icon}</span>
            <div>
              <p className="text-2xl font-bold text-on-surface leading-tight">{weather.temp}</p>
              <p className="text-xs text-on-surface-variant">{weather.condition}</p>
              <p className="text-xs text-on-surface-variant/60 truncate">{weather.location}</p>
            </div>
          </div>
        </CollapsiblePanelWidget>
      )}

      {/* 5. Mini Calendar */}
      <CollapsiblePanelWidget id="dash-calendar" title="Calendar" icon={<MIcon name="calendar_month" className="text-[14px]" />}>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center hover:bg-surface-container-high motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-primary" aria-label="Previous month">
            <MIcon name="chevron_left" className="text-[18px] text-on-surface-variant" />
          </button>
          <span className="text-xs font-semibold text-on-surface">{monthLabel}</span>
          <button onClick={nextMonth} className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center hover:bg-surface-container-high motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-primary" aria-label="Next month">
            <MIcon name="chevron_right" className="text-[18px] text-on-surface-variant" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-on-surface-variant/50 py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
            const hasEvent = monthEvents.has(day);
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                aria-label={`${calDate.toLocaleDateString(undefined, { month: 'long' })} ${day}${hasEvent ? `, ${monthEvents.get(day)} event${(monthEvents.get(day) ?? 0) > 1 ? 's' : ''}` : ''}`}
                aria-pressed={isSelected}
                className={`relative flex items-center justify-center h-8 rounded-lg text-xs font-medium motion-safe:transition-colors cursor-pointer ${
                  isToday
                    ? 'bg-primary text-on-primary'
                    : isSelected
                    ? 'bg-secondary-container text-on-secondary-container ring-1 ring-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {day}
                {hasEvent && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-secondary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        {selectedDay !== null && selectedDayEvents.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant/60 mb-1">
              {calDate.toLocaleDateString(undefined, { month: 'long' })} {selectedDay}
            </p>
            {selectedDayEvents.map(event => (
              <div key={event.id} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                <MIcon name="event" className="text-[14px] mt-0.5 shrink-0 text-tertiary" />
                <span className="font-medium truncate">{event.title}</span>
                <span className="text-on-surface-variant/50 shrink-0 ml-auto pl-1">
                  {new Date(event.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Selected day — no events */}
        {selectedDay !== null && selectedDayEvents.length === 0 && (
          <p className="mt-2 text-xs text-on-surface-variant/50 text-center">
            No events on {calDate.toLocaleDateString(undefined, { month: 'long' })} {selectedDay}
          </p>
        )}

        {/* Upcoming events (unfiltered, when no day selected) */}
        {selectedDay === null && upcomingEvents.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                <MIcon name="event" className="text-[14px] mt-0.5 shrink-0 text-tertiary" />
                <span className="font-medium truncate">{event.title}</span>
                <span className="text-on-surface-variant/50 shrink-0">
                  {new Date(event.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Calendar launcher */}
        <button
          onClick={onCalendar}
          className="mt-3 w-full text-xs text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded min-h-[44px] inline-flex items-center justify-center gap-1"
        >
          <MIcon name="open_in_new" className="text-[14px]" />
          View Full Calendar
        </button>
      </CollapsiblePanelWidget>

      {/* 6. Recent Photos / Pet of the Day — only when pets exist */}
      {featuredPet && (
        <CollapsiblePanelWidget id="dash-pet-of-day" title="Pet of the Day" icon={<MIcon name="star" className="text-[14px] text-primary" />}>
          <Link to="/pets" state={{ editPetId: featuredPet.id }} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
            <img
              src={featuredPet.image}
              alt={featuredPet.name}
              className="w-full h-24 object-cover rounded-xl mb-2 shadow-sm group-hover:opacity-90 motion-safe:transition-opacity"
              referrerPolicy="no-referrer"
            />
            <p className="text-sm font-semibold text-on-surface">{featuredPet.name}</p>
            <p className="text-xs text-on-surface-variant">{featuredPet.breed}</p>
          </Link>
        </CollapsiblePanelWidget>
      )}
    </>
  );
}
