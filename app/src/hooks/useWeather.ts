import { useState, useEffect, useRef } from 'react';

interface WeatherData {
  temp: string;
  condition: string;
  icon: string;
  location: string;
}

const ICON_MAP: Record<string, string> = {
  'Sunny': '☀️', 'Clear': '🌙', 'Partly cloudy': '⛅', 'Cloudy': '☁️',
  'Overcast': '☁️', 'Mist': '🌫️', 'Rain': '🌧️', 'Light rain': '🌦️',
  'Heavy rain': '🌧️', 'Snow': '❄️', 'Blizzard': '🌨️', 'Thunder': '⛈️',
  'Fog': '🌫️', 'Drizzle': '🌦️', 'Sleet': '🌨️',
};

export function useWeather(zipCode: string | undefined) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!zipCode) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(true);
      fetch(`https://wttr.in/${encodeURIComponent(zipCode)}?format=%l|%C|%t|%f`)
        .then(r => r.text())
        .then(text => {
          const [location, condition, temp] = text.split('|').map(s => s.trim());
          const icon = Object.entries(ICON_MAP).find(([k]) => condition?.includes(k))?.[1] ?? '🌤️';
          setWeather({ temp, condition, icon, location: location || zipCode });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 500);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [zipCode]);

  return { weather, loading };
}
