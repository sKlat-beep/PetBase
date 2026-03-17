/**
 * SafetyAlertsContext — Hyper-Local Community Safety Alerts
 *
 * Firestore collection: safetyAlerts/{alertId}
 * Schema:
 *   h3Index:      string  — H3 cell at resolution 7 (~5 km²); privacy-preserving, no exact coords
 *   zipCode:      string  — fallback for users without geolocation
 *   title:        string
 *   description:  string
 *   category:     'hazard' | 'wildlife' | 'toxic' | 'missing' | 'weather' | 'other'
 *   severity:     'low' | 'medium' | 'high'
 *   authorId:     string  — stored for moderation, never displayed publicly
 *   createdAt:    number  — Unix ms
 *   expiresAt:    number  — Unix ms (default: 3 days from createdAt)
 *
 * Query strategy:
 *   - Primary: `where('h3Index', 'in', kRing)` — matches center + 6 neighbors (~35 km²)
 *   - Fallback: `where('zipCode', '==', userZip)` when H3 unavailable
 *
 * Firestore Security Rules (add to rules block in firestoreService.ts JSDoc):
 *   match /safetyAlerts/{alertId} {
 *     allow read: if request.auth != null;
 *     allow create: if request.auth != null
 *       && request.resource.data.authorId == request.auth.uid
 *       && request.resource.data.expiresAt > request.time.toMillis();
 *     allow delete: if request.auth != null
 *       && (resource.data.authorId == request.auth.uid
 *           || request.auth.token.admin == true);
 *     allow update: if false; // alerts are immutable after creation
 *   }
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react';
import {
  collection, addDoc, getDocs,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { resolveUserH3, getH3KRing } from '../lib/h3Service';

export type AlertCategory = 'hazard' | 'wildlife' | 'toxic' | 'missing' | 'weather' | 'other';
export type AlertSeverity = 'low' | 'medium' | 'high';

export interface SafetyAlert {
  id: string;
  h3Index: string;
  zipCode: string;
  title: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  authorId: string;
  createdAt: number;
  expiresAt: number;
}

export const CATEGORY_LABELS: Record<AlertCategory, string> = {
  hazard:   'Hazard',
  wildlife: 'Wildlife',
  toxic:    'Toxic/Poison',
  missing:  'Missing Animal',
  weather:  'Weather',
  other:    'Other',
};

export const CATEGORY_COLORS: Record<AlertCategory, string> = {
  hazard:   'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  wildlife: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  toxic:    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  missing:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  weather:  'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  other:    'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
};

const ALERT_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

interface SafetyAlertsContextValue {
  alerts: SafetyAlert[];
  loading: boolean;
  userH3: string | null;
  createAlert: (data: Omit<SafetyAlert, 'id' | 'authorId' | 'createdAt' | 'expiresAt' | 'h3Index' | 'zipCode'>) => Promise<void>;
}

const SafetyAlertsContext = createContext<SafetyAlertsContextValue | null>(null);

export function SafetyAlertsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [userH3, setUserH3] = useState<string | null>(null);

  // Resolve the user's H3 index once profile/location is available
  useEffect(() => {
    if (!user) { setUserH3(null); return; }
    resolveUserH3(profile?.zipCode).then(setUserH3);
  }, [user, profile?.zipCode]);

  // Load alerts from Firestore whenever H3 index or zipCode changes
  useEffect(() => {
    if (!user) { setAlerts([]); return; }
    const zip = profile?.zipCode;
    if (!userH3 && !zip) return;

    setLoading(true);
    const now = Date.now();

    const fetchAlerts = async () => {
      try {
        let snap;
        if (userH3) {
          // Query the center cell + 1-ring neighbors (7 hexagons, ~35 km²)
          const neighbors = getH3KRing(userH3, 1);
          snap = await getDocs(
            query(
              collection(db, 'safetyAlerts'),
              where('h3Index', 'in', neighbors),
              orderBy('createdAt', 'desc'),
            )
          );
        } else {
          // Fallback: exact zip code match
          snap = await getDocs(
            query(
              collection(db, 'safetyAlerts'),
              where('zipCode', '==', zip),
              orderBy('createdAt', 'desc'),
            )
          );
        }

        const active = snap.docs
          .map(d => {
            const raw: Record<string, unknown> = { id: d.id, ...d.data() };
            for (const k of ['createdAt', 'expiresAt'] as const) {
              if (raw[k] instanceof Timestamp) raw[k] = (raw[k] as Timestamp).toMillis();
            }
            return raw as unknown as SafetyAlert;
          })
          .filter(a => a.expiresAt > now); // filter expired

        setAlerts(active);
      } catch (err) {
        console.error('SafetyAlerts fetch error:', err);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [user, userH3, profile?.zipCode]);

  const createAlert = useCallback(async (
    data: Omit<SafetyAlert, 'id' | 'authorId' | 'createdAt' | 'expiresAt' | 'h3Index' | 'zipCode'>
  ) => {
    if (!user) return;
    const now = Date.now();
    const newAlert = {
      ...data,
      h3Index: userH3 ?? '',
      zipCode: profile?.zipCode ?? '',
      authorId: user.uid,
      createdAt: now,
      expiresAt: now + ALERT_TTL_MS,
    };
    const docRef = await addDoc(collection(db, 'safetyAlerts'), newAlert);
    setAlerts(prev => [{ ...newAlert, id: docRef.id }, ...prev]);
  }, [user, userH3, profile?.zipCode]);

  return (
    <SafetyAlertsContext.Provider value={{ alerts, loading, userH3, createAlert }}>
      {children}
    </SafetyAlertsContext.Provider>
  );
}

export function useSafetyAlerts() {
  const ctx = useContext(SafetyAlertsContext);
  if (!ctx) throw new Error('useSafetyAlerts must be used within SafetyAlertsProvider');
  return ctx;
}
