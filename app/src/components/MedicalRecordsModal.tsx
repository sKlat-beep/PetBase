import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Syringe, Calendar, ClipboardList, FileText, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, Info, GripVertical, CalendarPlus, Pill, Zap, RefreshCw } from 'lucide-react';
import type { Pet } from '../contexts/PetContext';
import { usePets } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Vaccine {
  name: string;
  lastDate: string;      // ISO date string e.g. "2024-10-15"
  nextDueDate: string;   // ISO date string
  intervalDays?: number; // recurring interval (365 = annually, 0/undefined = manual)
}

export type VaccineStatus = 'up-to-date' | 'due-soon' | 'overdue' | 'unknown';

type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
};

// ─── Pet-type default vaccines ────────────────────────────────────────────────

const DOG_VACCINES: Vaccine[] = [
  { name: 'Rabies', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'DHPP (Distemper/Parvo)', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Bordetella', lastDate: '', nextDueDate: '', intervalDays: 182 },
  { name: 'Leptospirosis', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Lyme Disease', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Influenza', lastDate: '', nextDueDate: '', intervalDays: 365 },
];

const CAT_VACCINES: Vaccine[] = [
  { name: 'Rabies', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'FVRCP (Feline Distemper)', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'FeLV (Feline Leukemia)', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Chlamydophila felis', lastDate: '', nextDueDate: '', intervalDays: 365 },
];

const RABBIT_VACCINES: Vaccine[] = [
  { name: 'RHDV2 (Rabbit Hemorrhagic Disease)', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Myxomatosis', lastDate: '', nextDueDate: '', intervalDays: 365 },
];

const FERRET_VACCINES: Vaccine[] = [
  { name: 'Rabies', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Distemper', lastDate: '', nextDueDate: '', intervalDays: 365 },
];

const HORSE_VACCINES: Vaccine[] = [
  { name: 'Rabies', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Tetanus', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Eastern/Western Equine Encephalitis', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'West Nile Virus', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: 'Equine Herpesvirus', lastDate: '', nextDueDate: '', intervalDays: 182 },
  { name: 'Equine Influenza', lastDate: '', nextDueDate: '', intervalDays: 182 },
];

const BIRD_VACCINES: Vaccine[] = [
  { name: 'Polyomavirus', lastDate: '', nextDueDate: '', intervalDays: 365 },
  { name: "Pacheco's Disease (Psittacine Herpesvirus)", lastDate: '', nextDueDate: '', intervalDays: 365 },
];

const BIRD_TYPES = new Set([
  'parakeet', 'cockatiel', 'cockatoo', 'african grey parrot', 'amazon parrot',
  'conure', 'lovebird', 'finch', 'canary', 'dove', 'pigeon',
]);

function getDefaultVaccines(petType?: string): Vaccine[] {
  const t = (petType ?? '').toLowerCase();
  if (t === 'dog') return DOG_VACCINES;
  if (t === 'cat') return CAT_VACCINES;
  if (t === 'rabbit') return RABBIT_VACCINES;
  if (t === 'ferret') return FERRET_VACCINES;
  if (t === 'horse' || t === 'donkey') return HORSE_VACCINES;
  if (BIRD_TYPES.has(t)) return BIRD_VACCINES;
  return DOG_VACCINES; // sensible fallback
}

// ─── Recurring interval options ───────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { label: 'Manual (no auto-schedule)', value: 0 },
  { label: 'Every 3 months', value: 91 },
  { label: 'Every 6 months', value: 182 },
  { label: 'Every 1 year', value: 365 },
  { label: 'Every 3 years', value: 1095 },
  { label: 'Custom interval…', value: -1 },
];

const PREDEFINED_INTERVAL_VALS = new Set([0, 91, 182, 365, 1095]);

function parseIntervalText(text: string): number | undefined {
  const t = text.trim().toLowerCase();
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(day|week|month|year)?s?$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const unit = (m[2] ?? 'day');
  if (unit.startsWith('week')) return Math.round(n * 7);
  if (unit.startsWith('month')) return Math.round(n * 30.44);
  if (unit.startsWith('year')) return Math.round(n * 365.25);
  return Math.round(n);
}

// ─── Vaccine info tooltips ────────────────────────────────────────────────────

const VACCINE_INFO: Record<string, string> = {
  'Rabies': 'Required by law in most areas. Protects against rabies virus. Administered at 14-16 weeks, booster at 1 year, then every 1-3 years depending on local regulations and vaccine type (Nobivac, Imrab, Defensor).',
  'DHPP (Distemper/Parvo)': 'Core 4-in-1 vaccine (Distemper, Hepatitis/Adenovirus, Parainfluenza, Parvovirus). Given as a puppy series at 6-8, 10-12, and 14-16 weeks, then booster at 1 year, then every 1-3 years. Common brands: Vanguard Plus, NeoVac.',
  'Bordetella': 'Protects against Bordetella bronchiseptica (kennel cough). Available as injectable, intranasal, or oral. Recommended every 6-12 months for dogs that board, visit dog parks, grooming, or daycare.',
  'Leptospirosis': 'Protects against Leptospira bacteria spread through water and wildlife urine. Given as 2-dose initial series 2-4 weeks apart, then annually. Common brands: Nobivac Lepto 4, Vanguard L4.',
  'Lyme Disease': 'Protects against Borrelia burgdorferi (Lyme disease) transmitted by deer ticks. 2-dose initial series 2-4 weeks apart, then annually before tick season. Common brands: Lyme Vax, Recombitek Lyme.',
  'Influenza': 'Protects against canine influenza strains H3N2 and H3N8. Given as 2-dose series 2-4 weeks apart, then annually. Common brands: Nobivac Canine Flu Bivalent.',
  'FVRCP (Feline Distemper)': 'Core 3-in-1 cat vaccine (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia). Kitten series every 3-4 weeks until 16 weeks, then at 1 year, then every 1-3 years. Common brands: Purevax, Felocell.',
  'FeLV (Feline Leukemia)': 'Protects against Feline Leukemia Virus spread through saliva and grooming. Recommended for outdoor cats or those with outdoor contact. 2-dose initial series, then annually.',
  'RHDV2 (Rabbit Hemorrhagic Disease)': 'Highly contagious and often fatal viral disease in rabbits. Recommended annually or every 6 months in high-risk areas. Consult an exotic vet for availability in your region.',
  'Myxomatosis': 'Spread by fleas, mosquitoes, and direct contact. Primarily relevant in Europe and Australia. Combined Myxomatosis+RHDV vaccine available in some regions. Consult your exotic vet.',
  'Distemper': 'For ferrets: core vaccine against canine distemper virus (highly fatal in ferrets). Ferret-specific Purevax Ferret Distemper vaccine recommended. Puppy series then annually.',
  'Polyomavirus': 'For birds: recommended for all psittacines (parrots, cockatiels, parakeets). 2 doses 3-4 weeks apart in young birds, then annually. Protects against Avian Polyomavirus (APV).',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getVaccineStatus(nextDueDate: string): VaccineStatus {
  if (!nextDueDate) return 'unknown';
  const daysUntilDue = Math.ceil(
    (new Date(nextDueDate).getTime() - Date.now()) / 86_400_000
  );
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 14) return 'due-soon';
  return 'up-to-date';
}

function StatusBadge({ status }: { status: VaccineStatus }) {
  const map = {
    'up-to-date': {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Up to Date',
      cls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40',
    },
    'due-soon': {
      icon: <AlertTriangle className="w-3 h-3" />,
      label: 'Due Soon',
      cls: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40',
    },
    'overdue': {
      icon: <XCircle className="w-3 h-3" />,
      label: 'Overdue',
      cls: 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40',
    },
    'unknown': {
      icon: null,
      label: 'Not Set',
      cls: 'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700',
    },
  }[status];

  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${map.cls}`}>
      {map.icon}
      {map.label}
    </span>
  );
}

export function overallVaccineStatus(vaccines: Vaccine[]): VaccineStatus {
  const statuses = vaccines.map((v) => getVaccineStatus(v.nextDueDate));
  if (statuses.some((s) => s === 'overdue')) return 'overdue';
  if (statuses.some((s) => s === 'due-soon')) return 'due-soon';
  if (statuses.every((s) => s === 'up-to-date')) return 'up-to-date';
  return 'unknown';
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MedicalRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
  targetVaccineName?: string;
  initialTab?: Tab;
}

type Tab = 'vaccines' | 'visits' | 'medications';

type VetVisit = {
  date: string;
  clinic: string;
  reason: string;
  notes: string;
};

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors';

export function MedicalRecordsModal({ isOpen, onClose, pet, targetVaccineName, initialTab }: MedicalRecordsModalProps) {
  const { updatePet } = usePets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'vaccines');
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [visits, setVisits] = useState<VetVisit[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync with pet data when modal opens
  useEffect(() => {
    if (!isOpen || !pet) return;
    setActiveTab(initialTab ?? 'vaccines');
    setIsDirty(false);

    const typeDefaults = getDefaultVaccines(pet.type);
    const saved: Vaccine[] = (pet as any).vaccines ?? [];

    // Preserve user order if all type-defaults are already present
    const allDefaultsPresent = typeDefaults.every(d => saved.some(s => s.name === d.name));
    if (allDefaultsPresent && saved.length > 0) {
      setVaccines(saved);
    } else {
      const merged = typeDefaults.map(
        (def) => saved.find((v) => v.name === def.name) ?? def
      );
      const custom = saved.filter((v) => !typeDefaults.some((d) => d.name === v.name));
      setVaccines([...merged, ...custom]);
    }

    setVisits((pet.medicalVisits as VetVisit[]) ?? []);
    setMedications((pet as any).medications ?? []);
  }, [isOpen, pet]);

  // Deep-link scroll to target vaccine
  useEffect(() => {
    if (isOpen && activeTab === 'vaccines' && targetVaccineName) {
      setTimeout(() => {
        const id = `vaccine-${targetVaccineName.replace(/\s+/g, '-')}`;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-stone-800', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-stone-800');
          }, 2000);
        }
      }, 100);
    }
  }, [isOpen, activeTab, targetVaccineName, vaccines.length]);

  // ── Vaccine handlers ──────────────────────────────────────────────────────

  const updateVaccine = (i: number, field: keyof Vaccine, value: string | number | undefined) => {
    setVaccines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
    setIsDirty(true);
  };

  const administeredToday = (originalIndex: number) => {
    const today = new Date().toISOString().split('T')[0];
    setVaccines((prev) => {
      const next = [...prev];
      const v = next[originalIndex];
      const nextDue = v.intervalDays
        ? new Date(Date.now() + v.intervalDays * 86_400_000).toISOString().split('T')[0]
        : v.nextDueDate;
      next[originalIndex] = { ...v, lastDate: today, nextDueDate: nextDue };
      return next;
    });
    setIsDirty(true);
  };

  const addVaccine = () => {
    setVaccines((prev) => [...prev, { name: '', lastDate: '', nextDueDate: '', intervalDays: 365 }]);
    setIsDirty(true);
  };

  const removeVaccine = (i: number) => {
    setVaccines((prev) => prev.filter((_, idx) => idx !== i));
    setIsDirty(true);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target && (e.target as HTMLElement).classList.add('opacity-50');
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setVaccines(prev => {
      const newItems = [...prev];
      const itemsToMove = newItems.splice(draggedIndex, 1);
      newItems.splice(index, 0, itemsToMove[0]);
      return newItems;
    });
    setDraggedIndex(index);
    setIsDirty(true);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.target && (e.target as HTMLElement).classList.remove('opacity-50');
    setDraggedIndex(null);
  };

  const sortedVaccines = React.useMemo(() => {
    const urgent = vaccines.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => ['overdue', 'due-soon'].includes(getVaccineStatus(v.nextDueDate)));
    const normal = vaccines.map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => !['overdue', 'due-soon'].includes(getVaccineStatus(v.nextDueDate)));
    return [...urgent, ...normal];
  }, [vaccines]);

  // ── Visit handlers ────────────────────────────────────────────────────────

  const addVisit = () => {
    let defaultClinic = pet?.emergencyContacts?.vetInfo?.clinic?.trim() || '';
    if (!defaultClinic && user) {
      try {
        const raw = localStorage.getItem(`petbase-profile-emergency-${user.uid}`);
        if (raw) defaultClinic = JSON.parse(raw)?.vetInfo?.clinic?.trim() || '';
      } catch { /* ignore */ }
    }
    setVisits((prev) => [{ date: '', clinic: defaultClinic, reason: '', notes: '' }, ...prev]);
    setIsDirty(true);
  };

  const updateVisit = (i: number, field: keyof VetVisit, value: string) => {
    setVisits((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
    setIsDirty(true);
  };

  const removeVisit = (i: number) => {
    setVisits((prev) => prev.filter((_, idx) => idx !== i));
    setIsDirty(true);
  };

  // ── Medication handlers ───────────────────────────────────────────────────

  const addMedication = () => {
    setMedications((prev) => [
      { id: crypto.randomUUID(), name: '', dosage: '', frequency: 'Once daily', startDate: '', endDate: '', notes: '' },
      ...prev,
    ]);
    setIsDirty(true);
  };

  const updateMedication = (id: string, field: keyof Medication, value: string) => {
    setMedications((prev) => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    setIsDirty(true);
  };

  const removeMedication = (id: string) => {
    setMedications((prev) => prev.filter(m => m.id !== id));
    setIsDirty(true);
  };

  // ── Calendar ICS download ─────────────────────────────────────────────────

  const downloadICS = (vaccine: Vaccine) => {
    if (!vaccine.nextDueDate || !pet) return;
    const dateObj = new Date(vaccine.nextDueDate);
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const dtstart = `${year}${month}${day}T090000Z`;
    const dtend = `${year}${month}${day}T100000Z`;
    const summary = `[PetBase] ${pet.name}'s ${vaccine.name} Vaccine Due`;
    const description = `Reminder for ${pet.name}'s upcoming ${vaccine.name} vaccination.`;
    const icsContent = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PetBase//App//EN',
      'BEGIN:VEVENT', `DTSTART:${dtstart}`, `DTEND:${dtend}`,
      `SUMMARY:${summary}`, `DESCRIPTION:${description}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pet.name.replace(/\s+/g, '_')}_${vaccine.name.replace(/\s+/g, '_')}_Reminder.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!pet) return;
    updatePet({
      ...pet,
      medicalVisits: visits,
      ...({ vaccines, medications } as any),
    });
    setIsDirty(false);
    onClose();
  };

  const handleBackdropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!pet) return null;

  const overall = overallVaccineStatus(vaccines);
  const overallLabel =
    overall === 'up-to-date' ? '✅ All vaccines up to date'
      : overall === 'due-soon' ? '⚠️ Vaccine due soon'
        : overall === 'overdue' ? '❌ Overdue vaccines'
          : 'Set up vaccine dates below';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onPointerDown={handleBackdropPointerDown}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-100 dark:border-stone-700 w-full max-w-2xl z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Syringe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                    Medical Records
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{pet.name} · {overallLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-100 dark:border-stone-700 px-6 shrink-0 overflow-x-auto">
              {([
                { key: 'vaccines', icon: <Syringe className="w-4 h-4" />, label: 'Vaccines' },
                { key: 'visits', icon: <ClipboardList className="w-4 h-4" />, label: `Vet Visits${visits.length ? ` (${visits.length})` : ''}` },
                { key: 'medications', icon: <Pill className="w-4 h-4" />, label: `Medications${medications.length ? ` (${medications.length})` : ''}` },
              ] as { key: Tab; icon: React.ReactNode; label: string }[]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 py-3.5 px-2 mr-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6">

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                  <strong>Disclaimer: </strong>Always consult your vet's office for specific medical advice and dosages for your pet.
                </p>
              </div>

              {/* ── Vaccines tab ── */}
              {activeTab === 'vaccines' && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  {sortedVaccines.map((vaccine) => (
                    <div
                      key={vaccine.originalIndex}
                      id={`vaccine-${vaccine.name.replace(/\s+/g, '-')}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, vaccine.originalIndex)}
                      onDragOver={(e) => handleDragOver(e, vaccine.originalIndex)}
                      onDragEnd={handleDragEnd}
                      className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4 border border-stone-100 dark:border-stone-600 transition-all cursor-move"
                    >
                      {/* Name row */}
                      <div className="flex items-center gap-2 mb-3">
                        <GripVertical className="w-4 h-4 text-stone-300 dark:text-stone-500 cursor-grab active:cursor-grabbing shrink-0" />
                        <div className="flex-1 relative flex items-center gap-2 group">
                          <input
                            type="text"
                            value={vaccine.name}
                            onChange={(e) => updateVaccine(vaccine.originalIndex, 'name', e.target.value)}
                            placeholder="Vaccine name"
                            className={`${inputClass} font-medium flex-1`}
                          />
                          {VACCINE_INFO[vaccine.name] && (
                            <div className="relative flex items-center">
                              <Info className="w-4 h-4 text-stone-400 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                {VACCINE_INFO[vaccine.name]}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900 dark:border-t-stone-100" />
                              </div>
                            </div>
                          )}
                        </div>
                        <StatusBadge status={getVaccineStatus(vaccine.nextDueDate)} />
                        {['due-soon', 'overdue'].includes(getVaccineStatus(vaccine.nextDueDate)) && (
                          <button
                            type="button"
                            onClick={() => downloadICS(vaccine)}
                            className="text-stone-400 hover:text-blue-500 transition-colors p-1 rounded"
                            title="Add Reminder to Calendar"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeVaccine(vaccine.originalIndex)}
                          className="text-stone-400 hover:text-rose-500 transition-colors p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Date grid */}
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        return (
                          <div className="grid grid-cols-2 gap-3 pl-6 mb-2">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Last Administered</label>
                                <button type="button" onClick={() => updateVaccine(vaccine.originalIndex, 'lastDate', today)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">Today</button>
                              </div>
                              <input type="date" value={vaccine.lastDate} onChange={(e) => updateVaccine(vaccine.originalIndex, 'lastDate', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Next Due</label>
                                <button type="button" onClick={() => updateVaccine(vaccine.originalIndex, 'nextDueDate', today)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">Today</button>
                              </div>
                              <input type="date" value={vaccine.nextDueDate} onChange={(e) => updateVaccine(vaccine.originalIndex, 'nextDueDate', e.target.value)} className={inputClass} />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Interval + Administered Today */}
                      <div className="flex flex-col gap-1.5 pl-6 flex-1">
                        <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        {(() => {
                          const days = vaccine.intervalDays ?? 0;
                          const isCustom = days > 0 && !PREDEFINED_INTERVAL_VALS.has(days);
                          const selectVal = isCustom ? -1 : days;
                          return (
                            <>
                              <select
                                value={selectVal}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (val === -1) {
                                    updateVaccine(vaccine.originalIndex, 'intervalDays', 1);
                                  } else {
                                    updateVaccine(vaccine.originalIndex, 'intervalDays', val || undefined);
                                  }
                                }}
                                className="flex-1 px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {INTERVAL_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              {isCustom && (
                                <input
                                  type="text"
                                  defaultValue={`${days} days`}
                                  placeholder="e.g. 14 days, 2 months"
                                  onBlur={(e) => {
                                    const parsed = parseIntervalText(e.target.value);
                                    if (parsed && parsed > 0) {
                                      updateVaccine(vaccine.originalIndex, 'intervalDays', parsed);
                                      if (vaccine.lastDate) {
                                        const nextDue = new Date(new Date(vaccine.lastDate).getTime() + parsed * 86_400_000).toISOString().split('T')[0];
                                        updateVaccine(vaccine.originalIndex, 'nextDueDate', nextDue);
                                      }
                                    }
                                  }}
                                  className="w-32 px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            </>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => administeredToday(vaccine.originalIndex)}
                          title="Mark as administered today and auto-calculate next due date"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-xs font-medium shrink-0"
                        >
                          <Zap className="w-3 h-3" /> Today
                        </button>
                      </div>{/* end flex items-center row */}
                      </div>{/* end flex-col interval wrapper */}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addVaccine}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Vaccine
                  </button>
                </motion.div>
              )}

              {/* ── Vet Visits tab ── */}
              {activeTab === 'visits' && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={addVisit}
                    className="w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Log a Vet Visit
                  </button>

                  {visits.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-stone-200 dark:border-stone-600 rounded-xl">
                      <Calendar className="w-9 h-9 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                      <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">No visits recorded yet.</p>
                    </div>
                  ) : (
                    visits.map((visit, i) => (
                      <div
                        key={i}
                        className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4 border border-stone-100 dark:border-stone-600 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Date</span>
                              <button type="button" onClick={() => updateVisit(i, 'date', new Date().toISOString().split('T')[0])} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">Today</button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                              <input type="date" value={visit.date} onChange={(e) => updateVisit(i, 'date', e.target.value)} className={`${inputClass} flex-1`} />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVisit(i)}
                            className="text-stone-400 hover:text-rose-500 transition-colors p-1 rounded shrink-0 mt-5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {(() => {
                          const lastClinic = visits.slice(i + 1).concat(visits.slice(0, i)).find(v => v.clinic.trim())?.clinic;
                          let savedClinic = pet?.emergencyContacts?.vetInfo?.clinic?.trim() || '';
                          if (!savedClinic && user) {
                            try {
                              const raw = localStorage.getItem(`petbase-profile-emergency-${user.uid}`);
                              if (raw) savedClinic = JSON.parse(raw)?.vetInfo?.clinic?.trim() || '';
                            } catch { /* ignore */ }
                          }
                          const hint = !visit.clinic ? (lastClinic || savedClinic || undefined) : undefined;
                          const hintLabel = hint === lastClinic && lastClinic ? `Use last: ${lastClinic}` : hint ? `Use pet's vet: ${hint}` : undefined;
                          return (
                            <div>
                              {hint && hintLabel && (
                                <div className="flex justify-end mb-0.5">
                                  <button type="button" onClick={() => updateVisit(i, 'clinic', hint)} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">{hintLabel}</button>
                                </div>
                              )}
                              <input type="text" value={visit.clinic} onChange={(e) => updateVisit(i, 'clinic', e.target.value)} placeholder="Clinic / Vet name" className={inputClass} />
                            </div>
                          );
                        })()}
                        <input type="text" value={visit.reason} onChange={(e) => updateVisit(i, 'reason', e.target.value)} placeholder="Reason for visit" className={inputClass} />
                        <div className="relative">
                          <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                          <textarea
                            value={visit.notes}
                            onChange={(e) => updateVisit(i, 'notes', e.target.value)}
                            placeholder="Notes (diagnosis, treatments, follow-ups…)"
                            rows={2}
                            className={`${inputClass} pl-9 resize-none`}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {/* ── Medications tab ── */}
              {activeTab === 'medications' && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={addMedication}
                    className="w-full py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Medication
                  </button>

                  {medications.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-stone-200 dark:border-stone-600 rounded-xl">
                      <Pill className="w-9 h-9 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                      <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">No medications tracked yet.</p>
                      <p className="text-stone-400 dark:text-stone-500 text-xs mt-1">Add prescriptions, supplements, or ongoing treatments.</p>
                    </div>
                  ) : (
                    medications.map((med) => (
                      <div
                        key={med.id}
                        className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-4 border border-stone-100 dark:border-stone-600 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <Pill className="w-4 h-4 text-violet-500 shrink-0" />
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                              placeholder="Medication name (e.g., Apoquel, Bravecto)"
                              className={`${inputClass} font-medium flex-1`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMedication(med.id)}
                            className="text-stone-400 hover:text-rose-500 transition-colors p-1 rounded shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Dosage</label>
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                              placeholder="e.g., 16mg, 1 tablet"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Frequency</label>
                            {(() => {
                              const predefinedFreqs = ['Once daily','Twice daily','Every 8 hours','Every 12 hours','Weekly','Bi-weekly','Monthly','As needed'];
                              const isCustom = !predefinedFreqs.includes(med.frequency) && med.frequency !== '' && med.frequency !== 'Other';
                              const selectVal = predefinedFreqs.includes(med.frequency) ? med.frequency : 'Other';
                              return (
                                <>
                                  <select
                                    value={selectVal}
                                    onChange={(e) => updateMedication(med.id, 'frequency', e.target.value === 'Other' ? 'Other' : e.target.value)}
                                    className={inputClass}
                                  >
                                    <option value="">Select frequency</option>
                                    {predefinedFreqs.map(f => <option key={f}>{f}</option>)}
                                    <option value="Other">Other</option>
                                  </select>
                                  {(isCustom || med.frequency === 'Other') && (
                                    <input
                                      type="text"
                                      value={med.frequency === 'Other' ? '' : med.frequency}
                                      onChange={(e) => updateMedication(med.id, 'frequency', e.target.value || 'Other')}
                                      placeholder="e.g., Every 2 days, Every 6 hours"
                                      className={`${inputClass} mt-1.5`}
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">Start Date</label>
                              <button type="button" onClick={() => updateMedication(med.id, 'startDate', new Date().toISOString().split('T')[0])} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">Today</button>
                            </div>
                            <input type="date" value={med.startDate} onChange={(e) => updateMedication(med.id, 'startDate', e.target.value)} className={inputClass} />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">End Date <span className="font-normal text-stone-400">(optional)</span></label>
                              <button type="button" onClick={() => updateMedication(med.id, 'endDate', new Date().toISOString().split('T')[0])} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">Today</button>
                            </div>
                            <input type="date" value={med.endDate} onChange={(e) => updateMedication(med.id, 'endDate', e.target.value)} className={inputClass} />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Notes</label>
                          <textarea
                            value={med.notes}
                            onChange={(e) => updateMedication(med.id, 'notes', e.target.value)}
                            placeholder="Side effects to watch, administering instructions, prescribing vet…"
                            rows={2}
                            className={`${inputClass} resize-none`}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-stone-100 dark:border-stone-700 shrink-0 bg-stone-50/50 dark:bg-stone-800/50 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 dark:disabled:bg-stone-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                Save Records
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
