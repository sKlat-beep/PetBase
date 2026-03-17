import React, { useState, useEffect, useMemo } from 'react';
import { Plus, MessageSquare, MapPin, ShieldAlert, Calendar, Zap, TriangleAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { getActiveLostPets, type LostPetAlert } from '../../utils/lostPetsApi';
import { LostPetBanner } from '../LostPetBanner';
import { CollapsiblePanelWidget } from '../layout/CollapsiblePanelWidget';
import { useSafetyAlerts, CATEGORY_COLORS, CATEGORY_LABELS } from '../../contexts/SafetyAlertsContext';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DashboardRightPanelProps {
  onAddPet: () => void;
  onEmergency: () => void;
  onCalendar: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DashboardRightPanel({ onAddPet, onEmergency, onCalendar }: DashboardRightPanelProps) {
  const { profile } = useAuth();
  const { pets } = usePets();
  const { groups } = useCommunity();
  const navigate = useNavigate();

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

  // Weather
  const [weather, setWeather] = useState<{ temp: string; condition: string; icon: string; location: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    if (!profile?.zipCode) return;
    setWeatherLoading(true);
    fetch(`https://wttr.in/${encodeURIComponent(profile.zipCode)}?format=%l|%C|%t|%f`)
      .then(r => r.text())
      .then(text => {
        const [location, condition, temp] = text.split('|').map(s => s.trim());
        const iconMap: Record<string, string> = {
          'Sunny': '☀️', 'Clear': '🌙', 'Partly cloudy': '⛅', 'Cloudy': '☁️',
          'Overcast': '☁️', 'Mist': '🌫️', 'Rain': '🌧️', 'Light rain': '🌦️',
          'Heavy rain': '🌧️', 'Snow': '❄️', 'Blizzard': '🌨️', 'Thunder': '⛈️',
          'Fog': '🌫️', 'Drizzle': '🌦️', 'Sleet': '🌨️',
        };
        const icon = Object.entries(iconMap).find(([k]) => condition?.includes(k))?.[1] ?? '🌤️';
        setWeather({ temp, condition, icon, location: location || (profile.zipCode ?? '') });
      })
      .catch(() => {})
      .finally(() => setWeatherLoading(false));
  }, [profile?.zipCode]);

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
      {/* 1. Quick Actions */}
      <CollapsiblePanelWidget id="dash-quick-actions" title="Quick Actions" icon={<Zap className="w-3 h-3" />}>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAddPet}
            title="Add Pet"
            aria-label="Add Pet"
            className="flex items-center justify-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 motion-safe:transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate('/messages')}
            title="Messages"
            aria-label="Messages"
            className="flex items-center justify-center p-2 rounded-xl bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-900/50 text-sky-700 dark:text-sky-400 motion-safe:transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate('/search')}
            title="Find Services"
            aria-label="Find Services"
            className="flex items-center justify-center p-2 rounded-xl bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-100 dark:border-violet-900/50 text-violet-700 dark:text-violet-400 motion-safe:transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={onEmergency}
            title="Emergency"
            aria-label="Emergency"
            className="flex items-center justify-center p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 motion-safe:transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </CollapsiblePanelWidget>

      {/* 2. Lost Pet Alert — only when active */}
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
            <p className="text-xs text-stone-400 dark:text-zinc-500">No safety alerts in your area.</p>
          ) : (
            <div className="space-y-2">
              {safetyAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-stone-50 dark:bg-zinc-700/50 border border-stone-100 dark:border-zinc-700">
                  <TriangleAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${alert.severity === 'high' ? 'text-rose-500' : alert.severity === 'medium' ? 'text-amber-500' : 'text-sky-500'}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100 truncate">{alert.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLORS[alert.category]}`}>
                        {CATEGORY_LABELS[alert.category]}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{alert.description}</p>
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
              <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100 leading-tight">{weather.temp}</p>
              <p className="text-xs text-stone-500 dark:text-zinc-400">{weather.condition}</p>
              <p className="text-xs text-stone-400 dark:text-zinc-500 truncate">{weather.location}</p>
            </div>
          </div>
        </CollapsiblePanelWidget>
      )}

      {/* 4. Upcoming Events */}
      <CollapsiblePanelWidget id="dash-upcoming" title="Upcoming" icon={<Calendar className="w-3 h-3" />}>
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-stone-400 dark:text-zinc-500">No upcoming events</p>
        ) : (
          <div className="space-y-2 mb-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-start gap-1.5 text-xs text-stone-600 dark:text-zinc-300">
                <Calendar className="w-3 h-3 mt-0.5 shrink-0 text-indigo-500" aria-hidden="true" />
                <span className="font-medium truncate">{event.title}</span>
                <span className="text-stone-400 dark:text-zinc-500 shrink-0">· {new Date(event.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onCalendar}
          className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded mt-1"
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
            <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{featuredPet.name}</p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">{featuredPet.breed}</p>
          </Link>
        </CollapsiblePanelWidget>
      )}
    </>
  );
}
