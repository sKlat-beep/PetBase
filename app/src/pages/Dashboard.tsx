import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { formatPetAge } from '../lib/petAge';
import { Activity, Calendar, MapPin, Plus, ShieldAlert, Syringe, DollarSign, X, Eye, EyeOff, ExternalLink, Users, GripVertical, ChevronLeft, ChevronRight, LayoutDashboard, MessageSquare, Settings2, Heart, RotateCcw, Pencil, SearchX, Zap } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import GridLayout, { type Layout, type LayoutItem, type ResizeHandleAxis } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useAuth } from '../contexts/AuthContext';
import { usePets } from '../contexts/PetContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useExpenses } from '../contexts/ExpenseContext';
import type { Pet } from '../contexts/PetContext';
import { searchServices, type ServiceResult } from '../utils/serviceApi';
import { GettingStartedGuide } from '../components/GettingStartedGuide';
import { RecommendationBanner } from '../components/RecommendationBanner';
import { useRightPanel } from '../contexts/RightPanelContext';
import { Confetti, useCelebration } from '../components/ui/Confetti';
import { getStreakData } from '../utils/streaks';
import { ExpenseChart } from '../components/dashboard/ExpenseChart';
const DashboardRightPanel = React.lazy(() =>
  import('../components/dashboard/DashboardRightPanel').then(m => ({ default: m.DashboardRightPanel }))
);

const PetFormModal = React.lazy(() =>
  import('../components/PetFormModal').then(m => ({ default: m.PetFormModal }))
);
const CalendarModal = React.lazy(() =>
  import('../components/CalendarModal').then(m => ({ default: m.CalendarModal }))
);
const LostPetReportModal = React.lazy(() =>
  import('../components/dashboard/LostPetReportModal')
);
import { useSocial } from '../contexts/SocialContext';
import { getVaccineStatus } from '../components/MedicalRecordsModal';
import { saveDashboardLayout, loadDashboardLayout, type DashboardLayoutItem } from '../lib/firestoreService';

// ─── Constants ────────────────────────────────────────────────────────────────

const GUIDE_COMPLETE_KEY = 'petbase-guide-completed';
const LAYOUT_KEY = 'petbase-dashboard-layout-v3';
const HIDDEN_KEY = 'petbase-dashboard-hidden-v3';

type WidgetKey =
  | 'pet_health'
  | 'pet_of_day'
  | 'weather'
  | 'your_pets'
  | 'quick_actions'
  | 'upcoming'
  | 'expenses'
  | 'groups'
  | 'friends'
  | 'services'
  // v3 combined widgets
  | 'pet_health_pets'
  | 'groups_activity'
  | 'friends_activity'
  | 'today_reminders'
  | 'streak_counter';

const WIDGET_LABELS: Record<WidgetKey, string> = {
  pet_health: 'Pet Health Summary',
  pet_of_day: 'Pet of the Day',
  weather: 'Weather',
  your_pets: 'Your Pets',
  quick_actions: 'Quick Actions',
  upcoming: 'Upcoming Events',
  expenses: 'Expenses',
  groups: 'My Groups',
  friends: 'Friends',
  services: 'Local Services',
  pet_health_pets: 'Pets & Health',
  groups_activity: 'Groups & Activity',
  friends_activity: 'Friends & Activity',
  today_reminders: 'Today\'s Reminders',
  streak_counter: 'Health Streak',
};

const WIDGET_MIN_SIZES: Record<WidgetKey, { minW: number; minH: number }> = {
  pet_health: { minW: 3, minH: 3 },
  pet_of_day: { minW: 2, minH: 3 },
  weather: { minW: 2, minH: 2 },
  your_pets: { minW: 3, minH: 3 },
  quick_actions: { minW: 2, minH: 2 },
  upcoming: { minW: 2, minH: 3 },
  expenses: { minW: 2, minH: 3 },
  groups: { minW: 2, minH: 3 },
  friends: { minW: 2, minH: 2 },
  services: { minW: 3, minH: 3 },
  pet_health_pets: { minW: 3, minH: 2 },
  groups_activity: { minW: 4, minH: 4 },
  friends_activity: { minW: 4, minH: 4 },
  today_reminders: { minW: 2, minH: 2 },
  streak_counter: { minW: 2, minH: 2 },
};

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'pet_health_pets',  x: 0,  y: 0,  w: 12, h: 5 },
  { i: 'today_reminders',  x: 0,  y: 5,  w: 12, h: 3 },
  { i: 'groups_activity',  x: 0,  y: 8,  w: 6,  h: 5 },
  { i: 'friends_activity', x: 6,  y: 8,  w: 6,  h: 5 },
  { i: 'expenses',         x: 0,  y: 13, w: 4,  h: 4 },
  { i: 'services',         x: 4,  y: 13, w: 8,  h: 4 },
];

interface WidgetSnapConfig {
  itemHeight: number;
  minItems: number;
  padding: number;
}

const WIDGET_SNAP: Partial<Record<WidgetKey, WidgetSnapConfig>> = {
  pet_health:      { itemHeight: 60,  minItems: 1, padding: 72 },
  pet_health_pets: { itemHeight: 160, minItems: 1, padding: 72 },
  groups_activity: { itemHeight: 56,  minItems: 1, padding: 80 },
  friends_activity:{ itemHeight: 56,  minItems: 1, padding: 80 },
  groups:          { itemHeight: 56,  minItems: 1, padding: 72 },
  friends:         { itemHeight: 56,  minItems: 1, padding: 72 },
  upcoming:        { itemHeight: 72,  minItems: 1, padding: 80 },
  expenses:        { itemHeight: 64,  minItems: 1, padding: 96 },
  services:        { itemHeight: 120, minItems: 1, padding: 120 },
};

function addMinSizes(l: LayoutItem): LayoutItem {
  const key = l.i as WidgetKey;
  const min = WIDGET_MIN_SIZES[key] ?? { minW: 2, minH: 2 };
  return { ...l, minW: min.minW, minH: min.minH };
}

function loadLayout(): LayoutItem[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT.map(l => addMinSizes(l));
    const saved: LayoutItem[] = JSON.parse(raw);
    const savedKeys = new Set(saved.map(l => l.i));
    const missing = DEFAULT_LAYOUT.filter(l => !savedKeys.has(l.i));
    return [...saved, ...missing].map(l => addMinSizes(l));
  } catch {
    return DEFAULT_LAYOUT.map(l => addMinSizes(l));
  }
}

function loadHidden(): Set<WidgetKey> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// ─── EmergencyModal ───────────────────────────────────────────────────────────

function EmergencyModal({ onClose, onFindVet }: { onClose: () => void; onFindVet: () => void }) {
  const prefersReduced = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, a, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      tabIndex={-1}
    >
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={prefersReduced ? undefined : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white/75 dark:bg-neutral-900/75 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/30 border border-white/20 dark:border-white/10 w-full max-w-sm overflow-hidden"
      >
        <div className="bg-rose-600 p-5">
          <div className="flex items-center justify-between">
            <h2 id="emergency-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" /> Emergency Assistance
            </h2>
            <button
              onClick={onClose}
              aria-label="Close emergency assistance"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white rounded-lg motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-rose-100 text-sm mt-1">Tap a service below to get immediate help.</p>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={() => { onFindVet(); onClose(); }}
            className="w-full flex items-center gap-4 bg-rose-50/80 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 backdrop-blur-sm border border-rose-200/60 dark:border-rose-900/50 p-4 rounded-2xl motion-safe:transition-colors text-left"
          >
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="font-bold text-rose-900 dark:text-rose-100 text-sm">Nearest 24/7 ER Vet</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">Find emergency veterinary care near you</p>
            </div>
          </button>
          <a
            href="https://www.aspca.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-900/50 p-4 rounded-xl motion-safe:transition-colors text-left block"
          >
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center shrink-0">
              <ExternalLink className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-bold text-orange-900 dark:text-orange-100 text-sm">ASPCA Poison Control</p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">aspca.org · Available 24/7</p>
            </div>
          </a>
          <a
            href="https://www.petpoisonhelpline.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl motion-safe:transition-colors text-left block"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center shrink-0">
              <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-100 text-sm">Pet Poison Helpline</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">petpoisonhelpline.com · Available 24/7</p>
            </div>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user, profile } = useAuth();
  const { pets, addPet } = usePets();
  const navigate = useNavigate();
  const { setContent } = useRightPanel();

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isLostPetOpen, setIsLostPetOpen] = useState(false);

  // Guide
  const [guideCompleted, setGuideCompleted] = useState(
    () => localStorage.getItem(GUIDE_COMPLETE_KEY) === 'true'
  );
  const { confettiActive, celebrate } = useCelebration();

  // Streak
  const [streakCount, setStreakCount] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  useEffect(() => {
    if (!user) return;
    getStreakData(user.uid).then(d => { setStreakCount(d.currentStreak); setLongestStreak(d.longestStreak); });
  }, [user]);
  const handleGuideComplete = useCallback(() => {
    setGuideCompleted(true);
    celebrate('onboarding-complete');
  }, [celebrate]);

  // Grid layout
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutItem[]>(loadLayout);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetKey>>(loadHidden);
  const [editMode, setEditMode] = useState(false);
  const [layoutLoading, setLayoutLoading] = useState(true);

  // Widget rename
  const [widgetLabels, setWidgetLabels] = useState<Partial<Record<WidgetKey, string>>>(() => {
    try {
      const saved = localStorage.getItem('petbase-widget-labels');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [renamingWidget, setRenamingWidget] = useState<WidgetKey | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (key: WidgetKey) => {
    setRenamingWidget(key);
    setRenameValue(widgetLabels[key] ?? WIDGET_LABELS[key]);
  };

  const commitRename = (key: WidgetKey) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== WIDGET_LABELS[key]) {
      const next = { ...widgetLabels, [key]: trimmed };
      setWidgetLabels(next);
      localStorage.setItem('petbase-widget-labels', JSON.stringify(next));
    } else if (!trimmed || trimmed === WIDGET_LABELS[key]) {
      // Reset to default if empty or unchanged
      const next = { ...widgetLabels };
      delete next[key];
      setWidgetLabels(next);
      localStorage.setItem('petbase-widget-labels', JSON.stringify(next));
    }
    setRenamingWidget(null);
  };

  // Snapshots for Cancel
  const preEditLayoutRef = useRef<LayoutItem[] | null>(null);
  const preEditHiddenRef = useRef<Set<WidgetKey> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load layout from Firestore on mount
  useEffect(() => {
    if (!user?.uid) {
      setLayoutLoading(false);
      return;
    }
    const timeoutId = setTimeout(() => setLayoutLoading(false), 2000);
    loadDashboardLayout(user.uid)
      .then(saved => {
        if (saved) {
          const mergedLayout = saved.layout.map(l => addMinSizes(l as LayoutItem));
          const savedKeys = new Set(mergedLayout.map(l => l.i));
          const missing = DEFAULT_LAYOUT.filter(l => !savedKeys.has(l.i));
          const fullLayout = [...mergedLayout, ...missing.map(l => addMinSizes(l))];
          setLayout(fullLayout);
          localStorage.setItem(LAYOUT_KEY, JSON.stringify(fullLayout));
          const hiddenSet = new Set(saved.hiddenWidgets as WidgetKey[]);
          setHiddenWidgets(hiddenSet);
          localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hiddenSet]));
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeoutId);
        setLayoutLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const visibleLayout = layout.filter(l => !hiddenWidgets.has(l.i as WidgetKey));

  // Drag-only position updates (no resize)
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout(prev => {
      const merged = prev.map(item => {
        const updated = newLayout.find(n => n.i === item.i);
        return updated ? { ...item, ...updated } : item;
      });
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  // Snap-to-integer-items resize
  const onResizeStop = useCallback((newLayout: Layout, _oldItem: LayoutItem | null, _newItem: LayoutItem | null, _placeholder: LayoutItem | null, _event: Event) => {
    const ROW_HEIGHT = 80;
    const MARGIN = 16;
    const rowPx = ROW_HEIGHT + MARGIN; // 96px per grid row

    const snapped = newLayout.map(item => {
      const snap = WIDGET_SNAP[item.i as WidgetKey];
      if (!snap) return item;
      const heightPx = item.h * ROW_HEIGHT + (item.h - 1) * MARGIN;
      const contentPx = heightPx - snap.padding;
      const rawItems = contentPx / snap.itemHeight;
      const items = Math.max(snap.minItems, Math.round(rawItems));
      const targetPx = items * snap.itemHeight + snap.padding;
      const snappedH = Math.max(item.minH ?? 1, Math.round(targetPx / rowPx));
      return { ...item, h: snappedH };
    });

    setLayout(prev => {
      const merged = prev.map(it => {
        const updated = snapped.find(n => n.i === it.i);
        return updated ? { ...it, ...updated } : it;
      });
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const hideWidget = useCallback((key: WidgetKey) => {
    setHiddenWidgets(prev => {
      const next = new Set(prev);
      next.add(key);
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const showWidget = useCallback((key: WidgetKey) => {
    setHiddenWidgets(prev => {
      const next = new Set(prev);
      next.delete(key);
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    const defaultL = DEFAULT_LAYOUT.map(l => addMinSizes(l));
    setLayout(defaultL);
    setHiddenWidgets(new Set());
    localStorage.removeItem(LAYOUT_KEY);
    localStorage.removeItem(HIDDEN_KEY);
    if (user?.uid) {
      saveDashboardLayout(user.uid, defaultL as unknown as DashboardLayoutItem[], []).catch(() => {});
    }
  }, [user?.uid]);

  // Edit mode actions
  const enterEditMode = useCallback(() => {
    preEditLayoutRef.current = layout;
    preEditHiddenRef.current = new Set(hiddenWidgets);
    setEditMode(true);
  }, [layout, hiddenWidgets]);

  const cancelEdit = useCallback(() => {
    if (preEditLayoutRef.current) {
      setLayout(preEditLayoutRef.current);
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(preEditLayoutRef.current));
    }
    if (preEditHiddenRef.current) {
      setHiddenWidgets(preEditHiddenRef.current);
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...preEditHiddenRef.current]));
    }
    preEditLayoutRef.current = null;
    preEditHiddenRef.current = null;
    setEditMode(false);
  }, []);

  const saveEdit = useCallback(() => {
    preEditLayoutRef.current = null;
    preEditHiddenRef.current = null;
    setEditMode(false);
    if (user?.uid) {
      saveDashboardLayout(user.uid, layout as unknown as DashboardLayoutItem[], [...hiddenWidgets]).catch(() => {});
    }
  }, [user?.uid, layout, hiddenWidgets]);

  // Expenses
  const { expenses, addExpense, stopRecurring, totalExpenses } = useExpenses();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseRecurring, setNewExpenseRecurring] = useState(false);
  const [newExpenseFrequency, setNewExpenseFrequency] = useState<'Weekly' | 'Bi-weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [confirmStopId, setConfirmStopId] = useState<string | null>(null);
  const [expenseToast, setExpenseToast] = useState<string | null>(null);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseLabel || !newExpenseAmount) return;
    addExpense({
      label: newExpenseLabel,
      amount: parseFloat(newExpenseAmount),
      date: new Date().toISOString(),
      recurring: newExpenseRecurring || undefined,
      frequency: newExpenseRecurring ? newExpenseFrequency : undefined,
    });
    setNewExpenseLabel('');
    setNewExpenseAmount('');
    setNewExpenseRecurring(false);
    setShowExpenseForm(false);
    setExpenseToast('Expense added');
    setTimeout(() => setExpenseToast(null), 2500);
  };

  // Community / Social
  const { groups } = useCommunity();
  const { directory } = useSocial();

  const myGroups = useMemo(() =>
    groups
      .filter(g => user?.uid && g.members[user.uid])
      .sort((a, b) => {
        const lastA = a.posts[0]?.createdAt ?? a.createdAt ?? '';
        const lastB = b.posts[0]?.createdAt ?? b.createdAt ?? '';
        return String(lastB).localeCompare(String(lastA));
      })
      .slice(0, 3),
    [groups, user?.uid]
  );

  const myFriends = useMemo(() => {
    const friendUids: string[] = (profile as any)?.friends ?? [];
    return friendUids
      .map(uid => directory.find(p => p.uid === uid))
      .filter(Boolean)
      .slice(0, 3) as typeof directory;
  }, [profile, directory]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const birthdayPets = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return pets.filter(p => {
      if (!p.birthday) return false;
      const [, m, d] = p.birthday.split('-').map(Number);
      return m === month && d === day;
    });
  }, [pets]);

  const upcomingEvents = useMemo(() => {
    if (!user) return [];
    return groups
      .flatMap(g => g.events.map(e => ({ ...e, groupName: g.name })))
      .filter(e => e.attendeeIds.includes(user.uid))
      .map(e => ({
        id: e.id,
        title: e.title,
        pet: e.groupName,
        date: new Date(e.date).toLocaleDateString(),
        icon: Calendar,
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-950',
      }))
      .slice(0, 5);
  }, [user, groups]);

  type Reminder =
    | { type: 'vaccine'; petName: string; vaccineName: string; daysUntilDue: number }
    | { type: 'vet'; petName: string; clinic: string; when: 'today' | 'tomorrow' }
    | { type: 'medication'; petName: string; medName: string; frequency: string };

  const todayReminders = useMemo((): Reminder[] => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const list: Reminder[] = [];
    for (const pet of pets) {
      const vaccines = (pet as any).vaccines as { name: string; nextDueDate: string }[] | undefined;
      if (vaccines) {
        for (const v of vaccines) {
          if (!v.nextDueDate) continue;
          const days = Math.ceil((new Date(v.nextDueDate).getTime() - now) / 86_400_000);
          if (days >= 0 && days <= 7) {
            list.push({ type: 'vaccine', petName: pet.name, vaccineName: v.name, daysUntilDue: days });
          }
        }
      }
      const medVisits = (pet as any).medicalVisits as { date: string; clinic: string }[] | undefined;
      if (medVisits) {
        for (const visit of medVisits) {
          if (!visit.date) continue;
          const visitDate = new Date(visit.date);
          visitDate.setHours(0, 0, 0, 0);
          if (visitDate.getTime() === todayStart.getTime()) {
            list.push({ type: 'vet', petName: pet.name, clinic: visit.clinic || 'Vet', when: 'today' });
          } else if (visitDate.getTime() === todayStart.getTime() + 86_400_000) {
            list.push({ type: 'vet', petName: pet.name, clinic: visit.clinic || 'Vet', when: 'tomorrow' });
          }
        }
      }
      const meds = (pet as any).medications as { name: string; frequency?: string; endDate?: string }[] | undefined;
      if (meds) {
        for (const med of meds) {
          const isActive = !med.endDate || new Date(med.endDate).getTime() >= todayStart.getTime();
          if (isActive) {
            list.push({ type: 'medication', petName: pet.name, medName: med.name, frequency: med.frequency || '' });
          }
        }
      }
    }
    return list;
  }, [pets]);

  // Right panel
  useEffect(() => {
    setContent(
      <React.Suspense fallback={null}>
        <DashboardRightPanel
          onAddPet={() => setIsModalOpen(true)}
          onEmergency={() => setIsEmergencyOpen(true)}
          onCalendar={() => setIsCalendarOpen(true)}
        />
      </React.Suspense>
    );
    return () => setContent(null);
  }, [setContent]);

  // Services
  const SERVICE_CATS = ['Vets', 'Groomers', 'Sitters', 'Walkers', 'Trainers'] as const;
  const [serviceCatIdx, setServiceCatIdx] = useState(0);
  const [topService, setTopService] = useState<ServiceResult | null>(null);
  const petTypesKey = useMemo(
    () => [...new Set(pets.map(p => p.type ?? 'Dog'))].sort().join(','),
    [pets]
  );

  useEffect(() => {
    if (!profile?.zipCode) return;
    const petTypesQuery = petTypesKey ? petTypesKey.split(',') : ['Dog'];
    searchServices({ query: '', location: profile.zipCode, type: 'Vets', petTypesQuery })
      .then(res => { if (res.length > 0) setTopService(res[0]); });
  }, [profile?.zipCode, petTypesKey]);

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
        setWeather({ temp, condition, icon, location: location || profile.zipCode || '' });
      })
      .catch(() => {})
      .finally(() => setWeatherLoading(false));
  }, [profile?.zipCode]);

  const prefersReduced = useReducedMotion();

  const GLASS_CARD = 'h-full bg-white/75 dark:bg-neutral-800/75 backdrop-blur-xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden';

  // ─── Widget Renderer ──────────────────────────────────────────────────────

  function renderWidget(key: WidgetKey): React.ReactNode {
    switch (key) {

      case 'pet_health': {
        return (
          <section className={`${GLASS_CARD} p-5`} aria-label="Pet Health Summary">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Syringe className="w-5 h-5 text-emerald-500" aria-hidden="true" /> Pet Health
              </h2>
              <Link to="/pets" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">View all</Link>
            </div>
            {pets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">No pets added yet.</p>
                <button onClick={() => setIsModalOpen(true)} className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline min-h-[44px] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">Add your first pet</button>
              </div>
            ) : (
              <div className="space-y-3">
                {pets.slice(0, 4).map(pet => {
                  const vaccines = (pet as any).vaccines as { name: string; nextDueDate: string }[] | undefined;
                  const overdue = vaccines?.filter(v => getVaccineStatus(v.nextDueDate) === 'overdue').length ?? 0;
                  const dueSoon = vaccines?.filter(v => getVaccineStatus(v.nextDueDate) === 'due-soon').length ?? 0;
                  const allGood = overdue === 0 && dueSoon === 0;
                  return (
                    <Link key={pet.id} to="/pets" state={{ editPetId: pet.id }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                      {/* pet.image is resolved via PetContext token pipeline */}
                      <img src={pet.image} alt={pet.name} width={80} height={80} className="w-20 h-20 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{pet.name}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{pet.breed}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {overdue > 0 && <span className="text-xs bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full font-medium">{overdue} overdue</span>}
                        {dueSoon > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">{dueSoon} due soon</span>}
                        {allGood && <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Up to date</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      }

      case 'pet_of_day': {
        const dayIndex = pets.length > 0
          ? Math.floor(Date.now() / 86400000) % pets.length
          : -1;
        const featuredPet = dayIndex >= 0 ? pets[dayIndex] : null;
        return (
          <section className={`${GLASS_CARD} p-5 flex flex-col`} aria-label="Pet of the Day">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span aria-hidden="true">🌟</span> Pet of the Day
              </h2>
            </div>
            {!featuredPet ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">Add pets to see your daily feature.</p>
                <button onClick={() => setIsModalOpen(true)} className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline min-h-[44px] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">Add a pet</button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center gap-3">
                <img src={featuredPet.image} alt={featuredPet.name} width={96} height={96} className="w-24 h-24 rounded-2xl object-cover shadow-md shadow-black/10" referrerPolicy="no-referrer" />
                <div className="text-center">
                  <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{featuredPet.name}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{featuredPet.breed}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {featuredPet.age && <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full font-medium">{formatPetAge(featuredPet.birthday, featuredPet.age)}</span>}
                  {featuredPet.weight && <span className="text-xs bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 px-3 py-1 rounded-full font-medium">{featuredPet.weight}</span>}
                  {(featuredPet as any).color && <span className="text-xs bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 px-3 py-1 rounded-full font-medium">{(featuredPet as any).color}</span>}
                </div>
                <Link to="/pets" state={{ editPetId: featuredPet.id }} className="mt-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">View full profile →</Link>
              </div>
            )}
          </section>
        );
      }

      case 'weather': {
        return (
          <section className={`${GLASS_CARD} p-5 flex flex-col`} aria-label="Weather">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Weather
              </h2>
              {weather && <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate max-w-[120px]">{weather.location}</p>}
            </div>
            {!profile?.zipCode ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-2">Set your location in Settings to see local weather.</p>
                <Link to="/settings" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">Go to Settings</Link>
              </div>
            ) : weatherLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              </div>
            ) : weather ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <span className="text-5xl" role="img" aria-label={weather.condition}>{weather.icon}</span>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{weather.temp}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{weather.condition}</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">Weather unavailable</p>
              </div>
            )}
          </section>
        );
      }

      case 'your_pets': {
        const previewPets = pets.slice(0, 2);
        return (
          <section className={`${GLASS_CARD} p-6`} aria-label="Your Pets">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Your Pets</h2>
              <Link to="/pets" className="text-emerald-600 dark:text-emerald-400 font-medium text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">View All</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {previewPets.map((pet: Pet) => (
                <div key={pet.id} className="bg-white/60 dark:bg-neutral-700/60 rounded-xl p-4 border border-neutral-200/50 dark:border-neutral-600/50 flex flex-col gap-4">
                  <Link to="/pets" state={{ editPetId: pet.id }} className="flex items-center gap-4 group cursor-pointer">
                    <img src={pet.image} alt={pet.name} width={128} height={128} className="w-32 h-32 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 motion-safe:transition-colors">{pet.name}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{pet.breed}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {pet.age && <span className="bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded select-none">{formatPetAge(pet.birthday, pet.age)}</span>}
                        {pet.weight && <span className="bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded select-none">{pet.weight}</span>}
                      </div>
                    </div>
                  </Link>
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                    <Link to="/pets" state={{ editPetId: pet.id }} aria-label={`Edit ${pet.name}`} className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 motion-safe:transition-colors min-h-[44px]">
                      <Settings2 className="w-4 h-4 mb-1" aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wide">Edit</span>
                    </Link>
                    <Link to="/pets" state={{ openMedical: true, tab: 'meds', petId: pet.id }} aria-label={`Medications for ${pet.name}`} className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 motion-safe:transition-colors min-h-[44px]">
                      <Syringe className="w-4 h-4 mb-1" aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wide">Meds</span>
                    </Link>
                    <Link to="/cards" state={{ openCreateModal: true, petId: pet.id }} aria-label={`Pet card for ${pet.name}`} className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 motion-safe:transition-colors min-h-[44px]">
                      <ShieldAlert className="w-4 h-4 mb-1" aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wide">Card</span>
                    </Link>
                  </div>
                </div>
              ))}
              <button onClick={() => setIsModalOpen(true)} className="bg-neutral-50/80 dark:bg-neutral-700/50 border-2 border-dashed border-neutral-200 dark:border-neutral-600 rounded-2xl p-4 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 motion-safe:transition-colors min-h-[112px]">
                <Plus className="w-6 h-6 mb-2" />
                <span className="font-medium text-sm">Add Pet</span>
              </button>
            </div>
          </section>
        );
      }

      case 'quick_actions': {
        return (
          <section className={`${GLASS_CARD} p-4 flex flex-col gap-3`} aria-label="Quick Actions">
            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4" aria-hidden="true" /> Quick Actions
            </h2>
            <div className="flex flex-col gap-3 flex-1">
              {/* Emergency — full width */}
              <button
                onClick={() => setIsEmergencyOpen(true)}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 motion-safe:transition-colors min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                title="Open emergency vet finder"
              >
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-semibold">Emergency Vet</span>
              </button>
              {/* Three actions side by side */}
              <div className="grid grid-cols-3 gap-2 flex-1">
                <button
                  onClick={() => setIsLostPetOpen(true)}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-100 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 motion-safe:transition-colors min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  title="Report a lost pet"
                >
                  <SearchX className="w-5 h-5" aria-hidden="true" />
                  <span className="text-xs font-semibold text-center leading-tight">Lost Pet</span>
                </button>
                <button
                  onClick={() => navigate('/messages')}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-900/50 text-sky-700 dark:text-sky-400 motion-safe:transition-colors min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  title="Open messages"
                >
                  <MessageSquare className="w-5 h-5" aria-hidden="true" />
                  <span className="text-xs font-semibold text-center leading-tight">Messages</span>
                </button>
                <button
                  onClick={() => navigate('/search')}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-100 dark:border-violet-900/50 text-violet-700 dark:text-violet-400 motion-safe:transition-colors min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  title="Find local pet services"
                >
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                  <span className="text-xs font-semibold text-center leading-tight">Find Services</span>
                </button>
              </div>
            </div>
          </section>
        );
      }

      case 'upcoming': {
        return (
          <section className={`${GLASS_CARD} p-6`} aria-label="Upcoming Events">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Upcoming</h2>
              <Calendar className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            </div>
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
                <div key={event.id} className="flex gap-4 items-start">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${event.bg} ${event.color}`}>
                    <event.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">{event.title}</h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{event.pet} • {event.date}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
                  No upcoming events. Join a community group to see RSVPs here.
                </p>
              )}
            </div>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="w-full mt-6 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-50/80 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg motion-safe:transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              View Calendar
            </button>
          </section>
        );
      }

      case 'expenses': {
        return (
          <section className="h-full bg-emerald-50/80 dark:bg-emerald-950/30 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/10 shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden p-6" aria-label="Expenses">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Expenses
              </h2>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">${totalExpenses.toFixed(2)}</span>
            </div>
            {showExpenseForm ? (
              <form onSubmit={handleAddExpense} className="space-y-3 mb-4">
                <div>
                  <label htmlFor="expense-label" className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">Description</label>
                  <input
                    id="expense-label"
                    type="text"
                    required
                    placeholder="E.g., Vet bill, food"
                    value={newExpenseLabel}
                    onChange={(e) => setNewExpenseLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="expense-amount" className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">Amount ($)</label>
                  <input
                    id="expense-amount"
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-label="Recurring expense"
                    aria-checked={newExpenseRecurring}
                    onClick={() => setNewExpenseRecurring(v => !v)}
                    className={`relative w-9 h-5 rounded-full motion-safe:transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${newExpenseRecurring ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow motion-safe:transition-transform ${newExpenseRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm text-emerald-800 dark:text-emerald-200 select-none">Recurring</span>
                </div>
                {newExpenseRecurring && (
                  <div>
                    <label htmlFor="expense-frequency" className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">Frequency</label>
                    <select
                      id="expense-frequency"
                      value={newExpenseFrequency}
                      onChange={(e) => setNewExpenseFrequency(e.target.value as typeof newExpenseFrequency)}
                      className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>Weekly</option>
                      <option>Bi-weekly</option>
                      <option>Monthly</option>
                      <option>Yearly</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowExpenseForm(false); setNewExpenseRecurring(false); }}
                    className="flex-1 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/50 rounded-lg hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 motion-safe:transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg motion-safe:transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowExpenseForm(true)}
                className="w-full py-2 mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 rounded-lg motion-safe:transition-colors flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            )}
            {(() => {
              const recurring = expenses.filter(e => e.recurring);
              if (!recurring.length) return null;
              return (
                <div className="mb-3 p-3 bg-emerald-100/60 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wide">Recurring</p>
                  <div className="space-y-1.5">
                    {recurring.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">{e.label}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 ml-1">· {e.frequency}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">${e.amount.toFixed(2)}</span>
                          {confirmStopId === e.id ? (
                            <span className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setConfirmStopId(null)}
                                className="text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600 px-1.5 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                              >Cancel</button>
                              <button
                                type="button"
                                onClick={() => { stopRecurring(e.id); setConfirmStopId(null); }}
                                aria-label={`Confirm stop recurring expense ${e.label}`}
                                className="text-xs text-white bg-rose-500 hover:bg-rose-600 px-1.5 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                              >Stop</button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmStopId(e.id)}
                              aria-label={`Stop recurring expense ${e.label}`}
                              className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 text-xs font-semibold uppercase tracking-wide border border-rose-200 dark:border-rose-800 px-1.5 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            >Stop</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="space-y-3">
              {expenses.filter(e => !e.recurring).slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between text-sm py-1 border-b border-emerald-100/50 dark:border-emerald-800/50 last:border-0">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{expense.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">${expense.amount.toFixed(2)}</span>
                </div>
              ))}
              {expenses.filter(e => !e.recurring).length > 5 && (
                <Link to="/settings" className="block text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">
                  View all {expenses.filter(e => !e.recurring).length} expenses
                </Link>
              )}
              {expenses.length === 0 && !showExpenseForm && (
                <p className="text-sm text-center text-emerald-600/70 dark:text-emerald-400/70 py-2">No expenses yet</p>
              )}
            </div>
            <ExpenseChart expenses={expenses} />
            {expenseToast && (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg text-center motion-safe:animate-pulse"
              >
                {expenseToast}
              </div>
            )}
          </section>
        );
      }

      case 'groups': {
        return (
          <section className={`${GLASS_CARD} p-6`} aria-label="My Groups">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-500" aria-hidden="true" /> My Groups
              </h2>
              <Link to="/community" className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">View All</Link>
            </div>
            {myGroups.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">You haven't joined any groups yet.</p>
                <Link to="/community" className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">Browse groups</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {myGroups.map(g => (
                  <Link key={g.id} to={`/community/groups/${g.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 text-sm font-bold text-violet-700 dark:text-violet-300">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{g.name}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">{Object.keys(g.members).length} member{Object.keys(g.members).length !== 1 ? 's' : ''}</p>
                    </div>
                    {g.tags?.[0] && <span className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full shrink-0">{g.tags[0]}</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      }

      case 'friends': {
        return (
          <section className={`${GLASS_CARD} p-6`} aria-label="Friends">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" aria-hidden="true" /> Friends
              </h2>
              <Link to="/community" className="text-xs text-pink-600 dark:text-pink-400 hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">View All</Link>
            </div>
            {myFriends.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">No friends added yet.</p>
                <Link to="/community" className="text-sm text-pink-600 dark:text-pink-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">Find people</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {myFriends.map(f => (
                  <Link key={f.uid} to="/community" className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors">
                    {f.avatarUrl ? (
                      // avatarUrl resolved server-side before stored in SocialContext
                      <img src={f.avatarUrl} alt={f.displayName} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center shrink-0 text-sm font-bold text-pink-700 dark:text-pink-300">
                        {f.displayName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{f.displayName}</p>
                      {f.pets.length > 0 && <p className="text-xs text-neutral-400 dark:text-neutral-500">{f.pets.map(p => `${p.count} ${p.type}`).join(', ')}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      }

      case 'services': {
        return (
          <section className={`${GLASS_CARD} p-6`} aria-label="Local Services">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Local Services for You</h2>
              <Link to="/search" className="text-emerald-600 dark:text-emerald-400 font-medium text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">Find more</Link>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setServiceCatIdx(i => (i - 1 + SERVICE_CATS.length) % SERVICE_CATS.length)}
                aria-label="Previous category"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 motion-safe:transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2 flex-1 overflow-hidden">
                {SERVICE_CATS.map((cat, i) => (
                  <Link
                    key={cat}
                    to={`/search?type=${cat}`}
                    className={`flex-none px-4 py-2 rounded-full text-sm font-medium motion-safe:transition-colors border ${i === serviceCatIdx
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white/60 dark:bg-neutral-700/60 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                      } ${Math.abs(i - serviceCatIdx) > 1 ? 'hidden sm:flex' : 'flex'}`}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => setServiceCatIdx(i => (i + 1) % SERVICE_CATS.length)}
                aria-label="Next category"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 motion-safe:transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {topService ? (
              <div className="bg-white/60 dark:bg-neutral-700/60 rounded-2xl p-6 border border-neutral-100/60 dark:border-neutral-600/60 relative overflow-hidden shadow-sm hover:shadow-md motion-safe:transition-shadow">
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <img src={topService.image} alt={topService.name} width={96} height={96} className="w-24 h-24 rounded-xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">Top Rated Near You</span>
                    </div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">{topService.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-1"><MapPin className="w-4 h-4 text-emerald-500" /><span>{topService.distance}</span></div>
                      <div className="flex items-center gap-1"><Activity className="w-4 h-4 text-rose-400" /><span>{topService.type}</span></div>
                    </div>
                  </div>
                  <Link to="/search" className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm motion-safe:transition-colors text-center w-full sm:w-auto shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">View Profile</Link>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-50/80 dark:bg-neutral-700/50 rounded-2xl p-6 border border-dashed border-neutral-200 dark:border-neutral-600 text-center text-neutral-500 dark:text-neutral-400">
                <MapPin className="w-8 h-8 mx-auto mb-3 text-neutral-400" />
                <p>Set your Zip Code in the Search page to see top-rated services near you.</p>
              </div>
            )}
          </section>
        );
      }

      case 'pet_health_pets': {
        const displayPets = pets.slice(0, 6);
        return (
          <section className={`${GLASS_CARD} p-5`} aria-label="Pets & Health">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span aria-hidden="true">🐾</span> Pets &amp; Health
              </h2>
              <Link to="/pets" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayPets.map(pet => {
                const vaccines = (pet as any).vaccines as { name: string; nextDueDate: string }[] | undefined;
                const overdue = vaccines?.filter(v => getVaccineStatus(v.nextDueDate) === 'overdue').length ?? 0;
                const dueSoon = vaccines?.filter(v => getVaccineStatus(v.nextDueDate) === 'due-soon').length ?? 0;
                const allGood = overdue === 0 && dueSoon === 0;
                return (
                  <div key={pet.id} className="bg-white/60 dark:bg-neutral-700/60 rounded-xl p-3 border border-neutral-200/50 dark:border-neutral-600/50 flex flex-col gap-2">
                    <Link to="/pets" state={{ editPetId: pet.id }} className="flex flex-col items-center gap-2 group">
                      <img src={pet.image} alt={pet.name} width={112} height={112} className="w-28 h-28 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                      <div className="text-center min-w-0 w-full">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{pet.name}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{pet.breed}</p>
                        <div className="flex flex-wrap justify-center gap-1 mt-1">
                          {pet.age && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-medium text-neutral-600 dark:text-neutral-300">{formatPetAge(pet.birthday, pet.age)}</span>}
                          {pet.weight && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-medium text-neutral-600 dark:text-neutral-300">{pet.weight}</span>}
                        </div>
                      </div>
                    </Link>
                    <div className="flex justify-center">
                      {overdue > 0 && <span className="text-xs bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full font-medium">{overdue} overdue</span>}
                      {overdue === 0 && dueSoon > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">⚠ {dueSoon} due soon</span>}
                      {allGood && <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">✓ Up to date</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                      <Link to="/pets" state={{ editPetId: pet.id }} aria-label={`Edit ${pet.name}`} title="Edit" className="flex items-center justify-center p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 motion-safe:transition-colors min-h-[36px]">
                        <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                      <Link to="/pets" state={{ openMedical: true, tab: 'meds', petId: pet.id }} aria-label={`Medications for ${pet.name}`} title="Meds" className="flex items-center justify-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 motion-safe:transition-colors min-h-[36px]">
                        <Syringe className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                      <Link to="/cards" state={{ openCreateModal: true, petId: pet.id }} aria-label={`Pet card for ${pet.name}`} title="Card" className="flex items-center justify-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 motion-safe:transition-colors min-h-[36px]">
                        <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-neutral-50/80 dark:bg-neutral-700/50 border-2 border-dashed border-neutral-200 dark:border-neutral-600 rounded-xl p-3 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-emerald-600 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 motion-safe:transition-colors min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <Plus className="w-5 h-5 mb-1" aria-hidden="true" />
                <span className="text-xs font-medium">Add Pet</span>
              </button>
            </div>
            {pets.length > 6 && (
              <Link to="/pets" className="block text-xs text-center text-emerald-600 dark:text-emerald-400 font-medium hover:underline mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">
                View all {pets.length} pets →
              </Link>
            )}
          </section>
        );
      }

      case 'groups_activity': {
        const recentPosts = myGroups
          .flatMap(g => g.posts.map(p => ({ ...p, groupName: g.name, groupId: g.id })))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 3);
        const upcomingGroupEvents = groups
          .filter(g => user?.uid && g.members[user.uid])
          .flatMap(g => g.events.map(e => ({ ...e, groupName: g.name })))
          .filter(e => new Date(e.date) > new Date())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 2);
        return (
          <section className={`${GLASS_CARD} p-5`} aria-label="Groups & Activity">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-violet-500" aria-hidden="true" /> Groups &amp; Activity
            </h2>
            <div className="flex gap-4 h-full">
              {/* Left: My Groups */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">My Groups</p>
                {myGroups.length === 0 ? (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">Join groups to see them here</p>
                ) : (
                  <div className="space-y-2">
                    {myGroups.map(g => (
                      <Link key={g.id} to={`/community/groups/${g.id}`} className="flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                        <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-violet-700 dark:text-violet-300">
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{g.name}</p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">{Object.keys(g.members).length} members</p>
                        </div>
                        {g.tags?.[0] && <span className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full shrink-0 hidden sm:block">{g.tags[0]}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {/* Right: Recent Activity */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Recent Activity</p>
                {recentPosts.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {recentPosts.map(post => (
                      <Link key={post.id} to={`/community/groups/${post.groupId}`} className="block p-2 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{post.groupName}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{post.content.slice(0, 60)}{post.content.length > 60 ? '…' : ''}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{new Date(post.createdAt).toLocaleDateString()}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">No recent posts</p>
                )}
                {upcomingGroupEvents.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Upcoming Events</p>
                    {upcomingGroupEvents.map(event => (
                      <div key={event.id} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                        <span aria-hidden="true">📅</span>
                        <div className="min-w-0">
                          <span className="font-medium truncate block">{event.title}</span>
                          <span className="text-neutral-400 dark:text-neutral-500">{event.groupName} · {new Date(event.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      }

      case 'friends_activity': {
        const myFriendUids = (profile as any)?.friends ?? [] as string[];
        const friendEvents = groups
          .flatMap(g => g.events
            .filter(e => myFriendUids.some((uid: string) => e.attendeeIds.includes(uid)))
            .map(e => ({ ...e, groupName: g.name }))
          )
          .slice(0, 3);
        const sharedGroupsCount = groups.filter(g =>
          user?.uid && g.members[user.uid] &&
          myFriendUids.some((uid: string) => g.members[uid])
        ).length;
        return (
          <section className={`${GLASS_CARD} p-5`} aria-label="Friends & Activity">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-pink-500" aria-hidden="true" /> Friends &amp; Activity
            </h2>
            <div className="flex gap-4">
              {/* Left: My Friends */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">My Friends</p>
                {myFriends.length === 0 ? (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">Add friends to see their activity here</p>
                ) : (
                  <div className="space-y-2">
                    {myFriends.map(f => (
                      <Link key={f.uid} to="/community" className="flex items-center gap-2 p-2 rounded-xl hover:bg-neutral-50/80 dark:hover:bg-neutral-700/50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                        {f.avatarUrl ? (
                          <img src={f.avatarUrl} alt={f.displayName} width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-pink-700 dark:text-pink-300">
                            {f.displayName?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{f.displayName}</p>
                          {f.pets.length > 0 && <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{f.pets.map(p => `${p.count} ${p.type}`).join(', ')}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {/* Right: Friend Activity */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Friend Activity</p>
                {friendEvents.length === 0 && myFriends.length === 0 ? (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">Add friends to see their activity here</p>
                ) : friendEvents.length === 0 ? (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">No friend events yet</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {friendEvents.map(event => {
                      const attendingFriend = myFriends.find(f => event.attendeeIds.includes(f.uid));
                      return (
                        <div key={event.id} className="text-xs text-neutral-600 dark:text-neutral-300 p-2 rounded-xl bg-neutral-50/80 dark:bg-neutral-700/40">
                          <span aria-hidden="true">🐾 </span>
                          <span className="font-medium">{attendingFriend?.displayName ?? 'A friend'}</span>
                          {' is going to '}
                          <span className="font-medium">{event.title}</span>
                          {' — '}
                          <span className="text-neutral-400">{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {sharedGroupsCount > 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    You share <span className="font-semibold text-violet-600 dark:text-violet-400">{sharedGroupsCount}</span> group{sharedGroupsCount !== 1 ? 's' : ''} with friends
                  </p>
                )}
              </div>
            </div>
          </section>
        );
      }

      case 'today_reminders': {
        const reminders = todayReminders;
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
              <div className="space-y-2 overflow-y-auto max-h-[220px]">
                {reminders.map((r, idx) => {
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
            )}
          </section>
        );
      }

      case 'streak_counter':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{streakCount}</div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              {streakCount === 1 ? 'day streak' : 'day streak'}
            </p>
            {longestStreak > 0 && (
              <p className="text-xs text-neutral-400">Best: {longestStreak} days</p>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  const isMobile = containerWidth < 640;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="space-y-6"
      >
        {/* Getting Started Guide */}
        <Confetti active={confettiActive} />
        {!guideCompleted && <GettingStartedGuide onComplete={handleGuideComplete} />}
        {guideCompleted && <RecommendationBanner />}

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {greeting}, {user?.displayName?.split(' ')[0] || 'Pet Parent'}!
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              {pets.length > 0
                ? `Here's what's happening with ${pets.length === 1 ? pets[0].name : 'your furry friends'} today.`
                : "Here's what's happening with your furry friends today."}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!editMode && (
              <button
                onClick={enterEditMode}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                Edit Layout
              </button>
            )}
          </div>
        </header>

        {/* Birthday Banner */}
        <AnimatePresence>
          {birthdayPets.length > 0 && (
            <motion.div
              key="birthday-banner"
              initial={prefersReduced ? false : { opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-pink-400 to-emerald-400 p-0.5 shadow-lg"
              aria-live="polite"
            >
              {/* Confetti layer */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
                {Array.from({ length: 20 }).map((_, i) => {
                  const colors = ['bg-yellow-300', 'bg-pink-400', 'bg-emerald-400', 'bg-sky-300', 'bg-violet-400'];
                  const color = colors[i % colors.length];
                  const left = `${(i * 5.1) % 100}%`;
                  const delay = `${(i * 0.15) % 2}s`;
                  const duration = `${1.8 + (i % 5) * 0.3}s`;
                  const rotate = `${(i * 37) % 360}deg`;
                  return (
                    <motion.div
                      key={i}
                      className={`absolute w-2 h-2 rounded-sm opacity-80 ${color}`}
                      style={{ left, top: '-8px', rotate }}
                      animate={prefersReduced ? {} : {
                        y: ['0%', '120%'],
                        rotate: [rotate, `${(i * 37 + 180) % 360}deg`],
                        opacity: [0.9, 0],
                      }}
                      transition={{
                        duration: parseFloat(duration),
                        delay: parseFloat(delay),
                        repeat: Infinity,
                        ease: 'easeIn',
                      }}
                    />
                  );
                })}
              </div>

              {/* Banner content */}
              <div className="relative rounded-[14px] bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm px-6 py-4 flex items-center gap-3">
                <span className="text-3xl" role="img" aria-label="birthday cake">🎂</span>
                <div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    Happy Birthday,{' '}
                    {birthdayPets.length === 1
                      ? birthdayPets[0].name
                      : birthdayPets.slice(0, -1).map(p => p.name).join(', ') + ' & ' + birthdayPets[birthdayPets.length - 1].name}
                    !
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {birthdayPets.length === 1 ? 'Your furry friend' : 'Your furry friends'} {birthdayPets.length === 1 ? 'has' : 'have'} a birthday today. 🎉
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid container */}
        <div ref={containerRef} className="w-full">
          {/* Hidden widgets tray — edit mode only, shown ABOVE the grid */}
          {editMode && hiddenWidgets.size > 0 && (
            <div className="mb-6 p-4 bg-white/50 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-600">
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-3">Hidden Widgets — click to restore</p>
              <div className="flex flex-wrap gap-2">
                {[...hiddenWidgets].map(key => (
                  <button
                    key={key}
                    onClick={() => showWidget(key)}
                    className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 hover:text-emerald-700 dark:hover:text-emerald-400 motion-safe:transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    title={`Restore ${WIDGET_LABELS[key]}`}
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    {WIDGET_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {layoutLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              {visibleLayout
                .sort((a, b) => a.y - b.y || a.x - b.x)
                .map(l => (
                  <div key={l.i}>{renderWidget(l.i as WidgetKey)}</div>
                ))}
            </div>
          ) : (
            <GridLayout
              layout={visibleLayout}
              width={containerWidth}
              gridConfig={{ cols: 12, rowHeight: 80, margin: [16, 16] as [number, number], containerPadding: [0, 0] as [number, number] }}
              dragConfig={{ enabled: editMode, handle: '.widget-drag-handle' }}
              resizeConfig={{ enabled: editMode, handles: ['se', 'sw', 'ne', 'nw'] as ResizeHandleAxis[] }}
              onLayoutChange={handleLayoutChange}
              onResizeStop={onResizeStop}
              className="relative"
            >
              {visibleLayout.map(l => (
                <div key={l.i} className="relative group">
                  {renderWidget(l.i as WidgetKey)}
                  {editMode && (
                    <div className="absolute inset-0 z-10 rounded-2xl ring-2 ring-emerald-500/60 ring-offset-2 pointer-events-none motion-safe:animate-pulse">
                      <div className="absolute top-0 inset-x-0 flex items-center gap-2 px-3 py-2 bg-neutral-900/90 dark:bg-neutral-950/90 backdrop-blur-sm rounded-t-2xl pointer-events-auto">
                        <div className="widget-drag-handle cursor-grab active:cursor-grabbing min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" aria-label={`Drag ${WIDGET_LABELS[l.i as WidgetKey]}`} title="Drag to reorder">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        {renamingWidget === (l.i as WidgetKey) ? (
                          <input
                            type="text"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onBlur={() => commitRename(l.i as WidgetKey)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitRename(l.i as WidgetKey);
                              if (e.key === 'Escape') setRenamingWidget(null);
                            }}
                            className="text-xs font-semibold bg-transparent border-b border-neutral-400 outline-none flex-1 text-neutral-100 uppercase tracking-widest"
                            autoFocus
                            maxLength={40}
                          />
                        ) : (
                          <div className="flex items-center gap-1 flex-1 group/label min-w-0">
                            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-widest truncate select-none">{widgetLabels[l.i as WidgetKey] ?? WIDGET_LABELS[l.i as WidgetKey]}</span>
                            <button
                              onClick={() => startRename(l.i as WidgetKey)}
                              className="opacity-0 group-hover/label:opacity-100 transition-opacity p-0.5 rounded hover:bg-neutral-700 shrink-0"
                              aria-label={`Rename ${WIDGET_LABELS[l.i as WidgetKey]} widget`}
                              title="Rename widget"
                            >
                              <Pencil className="w-3 h-3 text-neutral-400" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => hideWidget(l.i as WidgetKey)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-rose-400 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          aria-label={`Hide ${WIDGET_LABELS[l.i as WidgetKey]}`}
                          title="Hide widget"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </GridLayout>
          )}

        </div>
      </motion.div>

      {/* Floating edit toolbar */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            key="edit-toolbar"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">Editing layout</span>
              <button
                onClick={resetLayout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                title="Reset to default layout"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <React.Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <PetFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={addPet}
        />
        <CalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          events={upcomingEvents}
        />
      </React.Suspense>
      <AnimatePresence>
        {isEmergencyOpen && (
          <EmergencyModal
            onClose={() => setIsEmergencyOpen(false)}
            onFindVet={() => navigate('/search?tab=services&filters=Emergency,24%2F7')}
          />
        )}
        {isLostPetOpen && (
          <React.Suspense fallback={null}>
            <LostPetReportModal
              pets={pets}
              onClose={() => setIsLostPetOpen(false)}
            />
          </React.Suspense>
        )}
      </AnimatePresence>
    </>
  );
}
