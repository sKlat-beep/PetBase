import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Calendar, Plus, ShieldAlert, DollarSign, Eye, EyeOff, GripVertical, LayoutDashboard, RotateCcw, Pencil } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import GridLayout, { type Layout, type LayoutItem, type ResizeHandleAxis } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useAuth } from '../contexts/AuthContext';
import { usePets } from '../contexts/PetContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useExpenses } from '../contexts/ExpenseContext';
import { GettingStartedGuide } from '../components/GettingStartedGuide';
import { RecommendationBanner } from '../components/RecommendationBanner';
import { useRightPanel } from '../contexts/RightPanelContext';
import { Confetti, useCelebration } from '../components/ui/Confetti';
import { getStreakData } from '../utils/streaks';
import { ExpenseChart } from '../components/dashboard/ExpenseChart';
import { PetHealthPetsWidget } from '../components/dashboard/widgets/PetHealthPetsWidget';
import { GroupsActivityWidget } from '../components/dashboard/widgets/GroupsActivityWidget';
import { FriendsActivityWidget } from '../components/dashboard/widgets/FriendsActivityWidget';
import { TodayRemindersWidget, type Reminder } from '../components/dashboard/widgets/TodayRemindersWidget';
const DashboardRightPanel = React.lazy(() =>
  import('../components/dashboard/DashboardRightPanel').then(m => ({ default: m.DashboardRightPanel }))
);
const EmergencyModal = React.lazy(() => import('../components/dashboard/EmergencyModal'));

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
import { saveDashboardLayout, loadDashboardLayout, type DashboardLayoutItem } from '../lib/firestoreService';

// ─── Constants ────────────────────────────────────────────────────────────────

const GUIDE_COMPLETE_KEY = 'petbase-guide-completed';
const LAYOUT_KEY = 'petbase-dashboard-layout-v3';
const HIDDEN_KEY = 'petbase-dashboard-hidden-v3';

type WidgetKey =
  | 'expenses'
  | 'pet_health_pets'
  | 'groups_activity'
  | 'friends_activity'
  | 'today_reminders'
  | 'streak_counter';

const WIDGET_LABELS: Record<WidgetKey, string> = {
  expenses: 'Expenses',
  pet_health_pets: 'Pets & Health',
  groups_activity: 'Groups & Activity',
  friends_activity: 'Friends & Activity',
  today_reminders: 'Today\'s Reminders',
  streak_counter: 'Health Streak',
};

const WIDGET_MIN_SIZES: Record<WidgetKey, { minW: number; minH: number }> = {
  expenses: { minW: 2, minH: 3 },
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
  { i: 'expenses',         x: 0,  y: 13, w: 12, h: 4 },
];

interface WidgetSnapConfig {
  itemHeight: number;
  minItems: number;
  padding: number;
}

const WIDGET_SNAP: Partial<Record<WidgetKey, WidgetSnapConfig>> = {
  pet_health_pets: { itemHeight: 160, minItems: 1, padding: 72 },
  groups_activity: { itemHeight: 56,  minItems: 1, padding: 80 },
  friends_activity:{ itemHeight: 56,  minItems: 1, padding: 80 },
  expenses:        { itemHeight: 64,  minItems: 1, padding: 96 },
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
    const filtered = saved.filter(l => l.i !== 'quick_actions');
    const savedKeys = new Set(filtered.map(l => l.i));
    const missing = DEFAULT_LAYOUT.filter(l => !savedKeys.has(l.i));
    return [...filtered, ...missing].map(l => addMinSizes(l));
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
    let rafId = 0;
    const ro = new ResizeObserver(entries => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setContainerWidth(entries[0].contentRect.width);
      });
    });
    ro.observe(el);
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
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
          const mergedLayout = saved.layout.filter(l => l.i !== 'quick_actions').map(l => addMinSizes(l as LayoutItem));
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

  const visibleLayout = layout.filter(l =>
    !hiddenWidgets.has(l.i as WidgetKey) && (l.i as WidgetKey) in WIDGET_LABELS
  );

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
          onCalendar={() => setIsCalendarOpen(true)}
        />
      </React.Suspense>
    );
    return () => setContent(null);
  }, [setContent]);

  const prefersReduced = useReducedMotion();

  const GLASS_CARD = 'h-full bg-white/75 dark:bg-neutral-800/75 backdrop-blur-xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden';

  // ─── Widget Renderer ──────────────────────────────────────────────────────

  function renderWidget(key: WidgetKey): React.ReactNode {
    switch (key) {

      case 'expenses': {
        return (
          <section className={`${GLASS_CARD} p-6`} aria-label="Expenses">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
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

      case 'pet_health_pets':
        return <PetHealthPetsWidget pets={pets} onAddPet={() => setIsModalOpen(true)} />;

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
        const groupSummaries = myGroups.map(g => ({ id: g.id, name: g.name, memberCount: Object.keys(g.members).length, firstTag: g.tags?.[0] }));
        return <GroupsActivityWidget myGroups={groupSummaries} recentPosts={recentPosts} upcomingGroupEvents={upcomingGroupEvents} />;
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
        return <FriendsActivityWidget myFriends={myFriends} friendEvents={friendEvents} sharedGroupsCount={sharedGroupsCount} />;
      }

      case 'today_reminders':
        return <TodayRemindersWidget reminders={todayReminders} />;

      case 'streak_counter':
        return (
          <section className={`${GLASS_CARD} flex flex-col items-center justify-center gap-2`} aria-label="Health Streak">
            <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{streakCount}</div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              day streak
            </p>
            {longestStreak > 0 && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Best: {longestStreak} days</p>
            )}
          </section>
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
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
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
                    <div className="absolute inset-0 z-10 rounded-2xl ring-2 ring-emerald-300 ring-offset-2 opacity-75 pointer-events-none">
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
                className="px-4 py-1.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emergency FAB */}
      <button
        onClick={() => setIsEmergencyOpen(true)}
        className={`fixed right-4 z-30 flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl px-5 py-3 min-h-[44px] motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950 ${editMode ? 'bottom-36 md:bottom-20' : 'bottom-20 md:bottom-6'}`}
        aria-label="Emergency"
      >
        <ShieldAlert className="w-5 h-5" aria-hidden="true" />
        <span className="font-semibold text-sm hidden sm:inline">Emergency</span>
      </button>

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
          <React.Suspense fallback={null}>
            <EmergencyModal
              onClose={() => setIsEmergencyOpen(false)}
              onFindVet={() => navigate('/search?tab=services&filters=Emergency,24%2F7')}
              onReportLost={() => setIsLostPetOpen(true)}
            />
          </React.Suspense>
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
