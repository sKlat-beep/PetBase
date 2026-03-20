import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useNavigate } from 'react-router';
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
import { useOnboarding } from '../hooks/useOnboarding';
import { useGamification } from '../hooks/useGamification';
import { pointsForNextLevel } from '../lib/gamificationService';
import LevelProgressCard from '../components/gamification/LevelProgressCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const LAYOUT_KEY = 'petbase-dashboard-layout-v4';
const HIDDEN_KEY = 'petbase-dashboard-hidden-v4';

type WidgetKey =
  | 'expenses'
  | 'pet_health_pets'
  | 'groups_activity'
  | 'friends_activity'
  | 'today_reminders'
  | 'streak_counter'
  | 'level_progress';

const WIDGET_LABELS: Record<WidgetKey, string> = {
  expenses: 'Expenses',
  pet_health_pets: 'Pets & Health',
  groups_activity: 'Groups Activity',
  friends_activity: 'Friends Activity',
  today_reminders: 'Upcoming Events',
  streak_counter: 'Start your Streak',
  level_progress: 'Level Progress',
};

const WIDGET_ICONS: Record<WidgetKey, string> = {
  expenses: 'payments',
  pet_health_pets: 'monitor_heart',
  groups_activity: 'groups',
  friends_activity: 'people',
  today_reminders: 'notifications_active',
  streak_counter: 'local_fire_department',
  level_progress: 'military_tech',
};

const WIDGET_MIN_SIZES: Record<WidgetKey, { minW: number; minH: number }> = {
  expenses: { minW: 2, minH: 3 },
  pet_health_pets: { minW: 3, minH: 2 },
  groups_activity: { minW: 4, minH: 4 },
  friends_activity: { minW: 4, minH: 4 },
  today_reminders: { minW: 2, minH: 2 },
  streak_counter: { minW: 2, minH: 2 },
  level_progress: { minW: 3, minH: 3 },
};

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'pet_health_pets',  x: 0,  y: 0,  w: 8,  h: 4 },
  { i: 'today_reminders',  x: 8,  y: 0,  w: 4,  h: 4 },
  { i: 'groups_activity',  x: 0,  y: 4,  w: 6,  h: 4 },
  { i: 'friends_activity', x: 6,  y: 4,  w: 6,  h: 4 },
  { i: 'streak_counter',   x: 0,  y: 8,  w: 8,  h: 3 },
  { i: 'expenses',         x: 8,  y: 8,  w: 4,  h: 3 },
  { i: 'level_progress',   x: 0,  y: 11, w: 12, h: 3 },
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

  // Guide — Firestore-persisted via useOnboarding
  const ob = useOnboarding(user?.uid ?? null);
  const gamification = useGamification(user?.uid ?? null);
  const gamificationProgress = gamification.state ? pointsForNextLevel(gamification.state.totalPoints) : { current: 0, next: 100, progress: 0 };
  const { confettiActive, celebrate } = useCelebration();

  const handleGuideComplete = useCallback(() => {
    celebrate('onboarding-complete');
  }, [celebrate]);

  const handleStepComplete = useCallback(() => {
    celebrate(`step-${Date.now()}`);
  }, [celebrate]);

  useEffect(() => {
    ob.checkMilestones(celebrate);
  }, [ob.checkMilestones, celebrate]);

  // Streak
  const [streakCount, setStreakCount] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  useEffect(() => {
    if (!user) return;
    getStreakData(user.uid).then(d => { setStreakCount(d.currentStreak); setLongestStreak(d.longestStreak); });
  }, [user]);

  // Grid layout
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutItem[]>(loadLayout);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetKey>>(loadHidden);
  const [editMode, setEditMode] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const toolbarDragRef = useRef<{ isDragging: boolean; offsetX: number; offsetY: number }>({ isDragging: false, offsetX: 0, offsetY: 0 });
  const toolbarElRef = useRef<HTMLDivElement>(null);
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
    const rowPx = ROW_HEIGHT + MARGIN;

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
        color: 'text-tertiary',
        bg: 'bg-tertiary-container',
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

  // Reset toolbar position when exiting edit mode
  useEffect(() => {
    if (!editMode) setToolbarPos(null);
  }, [editMode]);

  // Drag handlers for the floating toolbar
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      const drag = toolbarDragRef.current;
      if (!drag.isDragging) return;
      const el = toolbarElRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      setToolbarPos({
        x: Math.max(0, Math.min(clientX - drag.offsetX, maxX)),
        y: Math.max(0, Math.min(clientY - drag.offsetY, maxY)),
      });
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => { toolbarDragRef.current.isDragging = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  const prefersReduced = useReducedMotion();

  const WIDGET_CARD = 'h-full glass-card overflow-hidden';

  // ─── Widget Renderer ──────────────────────────────────────────────────────

  function renderWidget(key: WidgetKey): React.ReactNode {
    switch (key) {

      case 'expenses': {
        return (
          <section className={`${WIDGET_CARD} p-6`} aria-label="Expenses">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
                <span className="material-symbols-outlined text-primary-container">payments</span>
                Monthly Expenses
              </h2>
              <span className="text-xl font-bold text-primary-container">${totalExpenses.toFixed(2)}</span>
            </div>
            {showExpenseForm ? (
              <form onSubmit={handleAddExpense} className="space-y-3 mb-4">
                <div>
                  <label htmlFor="expense-label" className="block text-xs font-medium text-on-surface-variant mb-1">Description</label>
                  <input
                    id="expense-label"
                    type="text"
                    required
                    placeholder="E.g., Vet bill, food"
                    value={newExpenseLabel}
                    onChange={(e) => setNewExpenseLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container border-0 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div>
                  <label htmlFor="expense-amount" className="block text-xs font-medium text-on-surface-variant mb-1">Amount ($)</label>
                  <input
                    id="expense-amount"
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container border-0 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-label="Recurring expense"
                    aria-checked={newExpenseRecurring}
                    onClick={() => setNewExpenseRecurring(v => !v)}
                    className={`relative w-9 h-5 rounded-full motion-safe:transition-colors shrink-0 ${newExpenseRecurring ? 'bg-primary-container' : 'bg-outline'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow motion-safe:transition-transform ${newExpenseRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm text-on-surface-variant select-none">Recurring</span>
                </div>
                {newExpenseRecurring && (
                  <div>
                    <label htmlFor="expense-frequency" className="block text-xs font-medium text-on-surface-variant mb-1">Frequency</label>
                    <select
                      id="expense-frequency"
                      value={newExpenseFrequency}
                      onChange={(e) => setNewExpenseFrequency(e.target.value as typeof newExpenseFrequency)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border-0 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
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
                    className="flex-1 py-1.5 text-sm font-medium text-on-surface-variant bg-surface-container rounded-lg hover:bg-surface-container-high motion-safe:transition-colors min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 text-sm font-medium text-on-primary-container bg-primary-container hover:opacity-90 rounded-lg motion-safe:transition-colors min-h-[44px]"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowExpenseForm(true)}
                className="w-full py-2 mb-4 text-sm font-medium text-primary-container bg-primary-container/10 hover:bg-primary-container/20 rounded-lg motion-safe:transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span className="material-symbols-outlined text-lg">add</span> Add Expense
              </button>
            )}
            {(() => {
              const recurring = expenses.filter(e => e.recurring);
              if (!recurring.length) return null;
              return (
                <div className="mb-3 p-3 bg-secondary/10 rounded-xl border border-secondary/20">
                  <p className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">Recurring</p>
                  <div className="space-y-1.5">
                    {recurring.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium text-on-surface">{e.label}</span>
                          <span className="text-secondary ml-1">· {e.frequency}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-on-surface">${e.amount.toFixed(2)}</span>
                          {confirmStopId === e.id ? (
                            <span className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setConfirmStopId(null)}
                                className="text-xs text-on-surface-variant border border-outline-variant px-1.5 py-0.5 rounded"
                              >Cancel</button>
                              <button
                                type="button"
                                onClick={() => { stopRecurring(e.id); setConfirmStopId(null); }}
                                aria-label={`Confirm stop recurring expense ${e.label}`}
                                className="text-xs text-on-error bg-error hover:opacity-90 px-1.5 py-0.5 rounded"
                              >Stop</button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmStopId(e.id)}
                              aria-label={`Stop recurring expense ${e.label}`}
                              className="text-error hover:opacity-80 text-xs font-semibold uppercase tracking-wide border border-error/30 px-1.5 py-0.5 rounded"
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
                <div key={expense.id} className="flex items-center justify-between text-sm py-1 border-b border-outline-variant/30 last:border-0">
                  <div>
                    <p className="font-medium text-on-surface">{expense.label}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                  <span className="font-medium text-on-surface">${expense.amount.toFixed(2)}</span>
                </div>
              ))}
              {expenses.filter(e => !e.recurring).length > 5 && (
                <p className="text-xs text-on-surface-variant pt-1">
                  + {expenses.filter(e => !e.recurring).length - 5} more expenses
                </p>
              )}
              {expenses.length === 0 && !showExpenseForm && (
                <p className="text-sm text-center text-on-surface-variant/70 py-2">No expenses yet</p>
              )}
            </div>
            <ExpenseChart expenses={expenses} />
            {expenseToast && (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 px-3 py-2 bg-primary-container text-on-primary-container text-xs font-medium rounded-lg text-center motion-safe:animate-pulse"
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
          <section className={`${WIDGET_CARD} flex flex-col sm:flex-row items-center justify-center gap-6 p-6`} aria-label="Health Streak">
            {/* Streak ring */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="var(--outline-variant)" strokeWidth="6" opacity="0.3" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="var(--primary-container)" strokeWidth="6"
                  strokeDasharray={`${Math.min(streakCount / 30, 1) * 276.5} 276.5`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-primary-container tabular-nums">{streakCount}</span>
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">days</span>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
                {streakCount >= 7 ? 'On fire!' : streakCount > 0 ? 'Keep it up!' : 'Start your streak'}
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                {streakCount > 0
                  ? `You've been caring for your pets ${streakCount} day${streakCount === 1 ? '' : 's'} in a row.`
                  : 'Log a health activity to start your streak.'}
              </p>
              {longestStreak > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="material-symbols-outlined text-secondary text-lg">emoji_events</span>
                  <span className="text-xs text-on-surface-variant">Personal best: <strong className="text-secondary">{longestStreak} days</strong></span>
                </div>
              )}
            </div>
          </section>
        );

      case 'level_progress':
        return gamification.state ? (
          <LevelProgressCard state={gamification.state} pointsForNext={gamificationProgress} />
        ) : null;

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
        {/* Getting Started Guide / Recommendation Banner */}
        <Confetti active={confettiActive} />
        {!ob.guideCompleted && <GettingStartedGuide onComplete={handleGuideComplete} onStepComplete={handleStepComplete} />}
        {ob.guideCompleted && <RecommendationBanner />}

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>
              {greeting}, {user?.displayName?.split(' ')[0] || 'Pet Parent'}!
            </h1>
            <p className="text-on-surface-variant mt-1">
              {pets.length > 0
                ? `Here's what's happening with ${pets.length === 1 ? pets[0].name : 'your furry friends'} today.`
                : "Here's what's happening with your furry friends today."}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!editMode && (
              <button
                onClick={enterEditMode}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium motion-safe:transition-all border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-lg">dashboard_customize</span>
                Customize Layout
              </button>
            )}
          </div>
        </header>

        {/* Grid container */}
        <div ref={containerRef} className="w-full">
          {/* Hidden widgets tray — edit mode only */}
          {editMode && hiddenWidgets.size > 0 && (
            <div className="mb-6 p-4 bg-surface-container/50 rounded-2xl border border-dashed border-outline-variant">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-3">Hidden Widgets — click to restore</p>
              <div className="flex flex-wrap gap-2">
                {[...hiddenWidgets].map(key => (
                  <button
                    key={key}
                    onClick={() => showWidget(key)}
                    className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-primary-container/10 hover:border-primary-container/30 hover:text-primary-container motion-safe:transition-colors text-sm font-medium"
                    title={`Restore ${WIDGET_LABELS[key]}`}
                  >
                    <span className="material-symbols-outlined text-lg">visibility</span>
                    {WIDGET_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {layoutLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-surface-container animate-pulse" />
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
                    <div className="absolute inset-0 z-10 rounded-2xl ring-2 ring-primary-container ring-offset-2 opacity-75 pointer-events-none">
                      <div className="absolute top-0 inset-x-0 flex items-center gap-2 px-3 py-2 bg-background/90 backdrop-blur-sm rounded-t-2xl pointer-events-auto">
                        <div className="widget-drag-handle cursor-grab active:cursor-grabbing min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-variant hover:text-on-surface" aria-label={`Drag ${WIDGET_LABELS[l.i as WidgetKey]}`} title="Drag to reorder">
                          <span className="material-symbols-outlined">drag_indicator</span>
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
                            className="text-xs font-semibold bg-transparent border-b border-on-surface-variant outline-none flex-1 text-on-surface uppercase tracking-widest"
                            autoFocus
                            maxLength={40}
                          />
                        ) : (
                          <div className="flex items-center gap-1 flex-1 group/label min-w-0">
                            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest truncate select-none">{widgetLabels[l.i as WidgetKey] ?? WIDGET_LABELS[l.i as WidgetKey]}</span>
                            <button
                              onClick={() => startRename(l.i as WidgetKey)}
                              className="opacity-0 group-hover/label:opacity-100 transition-opacity p-0.5 rounded hover:bg-surface-container-high shrink-0"
                              aria-label={`Rename ${WIDGET_LABELS[l.i as WidgetKey]} widget`}
                              title="Rename widget"
                            >
                              <span className="material-symbols-outlined text-sm text-on-surface-variant">edit</span>
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => hideWidget(l.i as WidgetKey)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-on-surface-variant hover:text-error motion-safe:transition-colors"
                          aria-label={`Hide ${WIDGET_LABELS[l.i as WidgetKey]}`}
                          title="Hide widget"
                        >
                          <span className="material-symbols-outlined">visibility_off</span>
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
            ref={toolbarElRef}
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={toolbarPos ? 'fixed z-40' : 'fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40'}
            style={toolbarPos ? { left: toolbarPos.x, top: toolbarPos.y } : undefined}
          >
            <div className="glass-card px-8 py-5 flex items-center gap-3 border border-outline-variant/50 shadow-lg">
              {/* Drag handle */}
              <span
                className="material-symbols-outlined text-on-surface-variant/60 cursor-grab active:cursor-grabbing shrink-0 select-none"
                onMouseDown={(e) => {
                  const el = toolbarElRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  toolbarDragRef.current = { isDragging: true, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
                  if (!toolbarPos) setToolbarPos({ x: rect.left, y: rect.top });
                }}
                onTouchStart={(e) => {
                  if (e.touches.length !== 1) return;
                  const el = toolbarElRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  const touch = e.touches[0];
                  toolbarDragRef.current = { isDragging: true, offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top };
                  if (!toolbarPos) setToolbarPos({ x: rect.left, y: rect.top });
                }}
              >drag_indicator</span>
              <span className="material-symbols-outlined text-primary-container shrink-0">dashboard_customize</span>
              <span className="text-sm font-medium text-on-surface whitespace-nowrap">Editing layout</span>
              <button
                onClick={resetLayout}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high motion-safe:transition-colors"
                title="Reset to default layout"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                Reset
              </button>
              <button
                onClick={cancelEdit}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high motion-safe:transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-container hover:opacity-90 text-on-primary-container shadow-sm motion-safe:transition-colors"
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
        className={`fixed right-4 z-30 flex items-center gap-2 bg-error hover:opacity-90 text-on-error rounded-full shadow-2xl px-5 py-3 min-h-[44px] motion-safe:transition-all ${editMode ? 'bottom-36 md:bottom-20' : 'bottom-20 md:bottom-6'}`}
        aria-label="Emergency"
      >
        <span className="material-symbols-outlined">emergency</span>
        <span className="font-semibold text-sm hidden sm:inline">Emergency</span>
      </button>

      <React.Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" /></div>}>
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
