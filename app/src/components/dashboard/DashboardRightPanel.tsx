import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Calendar, MapPin, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { getActiveLostPets, type LostPetAlert } from '../../utils/lostPetsApi';
import { LostPetBanner } from '../LostPetBanner';
import { CollapsiblePanelWidget } from '../layout/CollapsiblePanelWidget';
import { useSafetyAlerts, CATEGORY_COLORS, CATEGORY_LABELS } from '../../contexts/SafetyAlertsContext';
import { useWeather } from '../../hooks/useWeather';

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

  return (
    <>
      {/* 1. Lost Pet Alert — only when active */}
      {lostPet && (
        <CollapsiblePanelWidget id="dash-lost-pet" title="Lost Pet Alert" icon={<ShieldAlert className="w-3 h-3" />}>
          <LostPetBanner lostPet={lostPet} />
        </CollapsiblePanelWidget>
      )}

      {/* 3. Safety Alerts — collapsible, collapsed by default */}
      <CollapsiblePanelWidget
        id="dash-safety-alerts"
        title="Safety Alerts"
        icon={<TriangleAlert className="w-3 h-3 text-amber-500" />}
        defaultExpanded={false}
        badge={unseenCount > 0 ? (
          <span className="ml-auto mr-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unseenCount}
          </span>
        ) : undefined}
      >
        <div onClick={markAlertsSeen}>
          {safetyAlerts.length === 0 ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">No safety alerts in your area.</p>
          ) : (
            <div className="space-y-2">
              {safetyAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-100 dark:border-neutral-700">
                  <TriangleAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${alert.severity === 'high' ? 'text-rose-500' : alert.severity === 'medium' ? 'text-amber-500' : 'text-sky-500'}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{alert.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLORS[alert.category]}`}>
                        {CATEGORY_LABELS[alert.category]}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsiblePanelWidget>

      {/* 4. Weather — only when data available */}
      {!weatherLoading && weather && (
        <CollapsiblePanelWidget id="dash-weather" title="Weather" icon={<MapPin className="w-3 h-3" />}>
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none" role="img" aria-label={weather.condition}>{weather.icon}</span>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{weather.temp}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{weather.condition}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{weather.location}</p>
            </div>
          </div>
        </CollapsiblePanelWidget>
      )}

      {/* 4. Upcoming Events */}
      <CollapsiblePanelWidget id="dash-upcoming" title="Upcoming" icon={<Calendar className="w-3 h-3" />}>
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">No upcoming events</p>
        ) : (
          <div className="space-y-2 mb-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                <Calendar className="w-3 h-3 mt-0.5 shrink-0 text-indigo-500" aria-hidden="true" />
                <span className="font-medium truncate">{event.title}</span>
                <span className="text-neutral-400 dark:text-neutral-500 shrink-0">· {new Date(event.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onCalendar}
          className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded mt-1 min-h-[44px] inline-flex items-center"
        >
          View Calendar
        </button>
      </CollapsiblePanelWidget>

      {/* 5. Pet of the Day — only when pets exist */}
      {featuredPet && (
        <CollapsiblePanelWidget id="dash-pet-of-day" title="Pet of the Day" icon={<span>🌟</span>}>
          <Link to="/pets" state={{ editPetId: featuredPet.id }} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl">
            <img
              src={featuredPet.image}
              alt={featuredPet.name}
              className="w-full h-24 object-cover rounded-xl mb-2 shadow-sm group-hover:opacity-90 motion-safe:transition-opacity"
              referrerPolicy="no-referrer"
            />
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{featuredPet.name}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{featuredPet.breed}</p>
          </Link>
        </CollapsiblePanelWidget>
      )}
    </>
  );
}
