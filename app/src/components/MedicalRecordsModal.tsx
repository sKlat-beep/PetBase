import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  { label: 'Custom interval...', value: -1 },
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
      icon: 'check_circle',
      label: 'Up to Date',
      cls: 'text-on-secondary-container bg-secondary-container',
    },
    'due-soon': {
      icon: 'schedule',
      label: 'Due Soon',
      cls: 'text-on-primary-container bg-primary-container',
    },
    'overdue': {
      icon: 'error',
      label: 'Overdue',
      cls: 'text-on-error-container bg-error-container',
    },
    'unknown': {
      icon: '',
      label: 'Not Set',
      cls: 'text-on-surface-variant bg-surface-container-highest',
    },
  }[status];

  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${map.cls}`}>
      {map.icon && <span className="material-symbols-outlined text-[14px]">{map.icon}</span>}
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
  'w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-colors';

const TAB_CONFIG: { key: Tab; icon: string; label: string }[] = [
  { key: 'vaccines', icon: 'vaccines', label: 'Vaccines' },
  { key: 'visits', icon: 'assignment', label: 'Vet Visits' },
  { key: 'medications', icon: 'medication', label: 'Medications' },
];

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
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
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

  const petAge = React.useMemo(() => {
    if (!pet?.birthday) return null;
    const born = new Date(pet.birthday);
    const now = new Date();
    let years = now.getFullYear() - born.getFullYear();
    let months = now.getMonth() - born.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years}y ${months}m`;
    return `${months}m`;
  }, [pet?.birthday]);

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
  const overallIcon =
    overall === 'up-to-date' ? 'check_circle'
      : overall === 'due-soon' ? 'schedule'
        : overall === 'overdue' ? 'error'
          : 'help_outline';
  const overallLabel =
    overall === 'up-to-date' ? 'All vaccines up to date'
      : overall === 'due-soon' ? 'Vaccine due soon'
        : overall === 'overdue' ? 'Overdue vaccines'
          : 'Set up vaccine dates below';
  const overallColor =
    overall === 'up-to-date' ? 'text-secondary'
      : overall === 'due-soon' ? 'text-primary'
        : overall === 'overdue' ? 'text-error'
          : 'text-on-surface-variant';

  // Status icon helper for vaccine cards
  const vaccineStatusIcon = (status: VaccineStatus) => {
    if (status === 'up-to-date') return { icon: 'shield', color: 'text-secondary bg-secondary-container' };
    if (status === 'due-soon') return { icon: 'warning', color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/40' };
    if (status === 'overdue') return { icon: 'history', color: 'text-error bg-error-container' };
    return { icon: 'help_outline', color: 'text-on-surface-variant bg-surface-container-highest' };
  };

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
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal card — split-pane layout */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="medical-records-modal-title"
            className="relative glass-card w-full max-w-4xl z-10 flex flex-col sm:flex-row h-[700px] max-h-[90vh] overflow-hidden rounded-2xl"
          >
            {/* ── Left Sidebar (w-72) ── Desktop only */}
            <div className="hidden sm:flex flex-col w-72 shrink-0 border-r border-outline-variant bg-surface-container-high">
              {/* Pet avatar + info */}
              <div className="p-6 flex flex-col items-center gap-3 border-b border-outline-variant">
                <div className="bg-gradient-to-br from-primary via-tertiary to-secondary p-[3px] rounded-2xl">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container">
                    {pet.image ? (
                      <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-[32px]">pets</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h2 id="medical-records-modal-title" className="text-lg font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
                    {pet.name}
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {[pet.breed, petAge].filter(Boolean).join(' \u00B7 ')}
                  </p>
                </div>
              </div>

              {/* Vertical tab navigation */}
              <nav className="flex-1 p-3 space-y-1">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${activeTab === tab.key
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                  >
                    <span className={"material-symbols-outlined text-[20px]"}
                      style={activeTab === tab.key ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >{tab.icon}</span>
                    {tab.label}
                    {tab.key === 'visits' && visits.length > 0 && (
                      <span className="ml-auto text-xs bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded-full">{visits.length}</span>
                    )}
                    {tab.key === 'medications' && medications.length > 0 && (
                      <span className="ml-auto text-xs bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded-full">{medications.length}</span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Health Status card with sync indicator */}
              <div className="p-4 m-3 rounded-2xl bg-surface-container border border-outline-variant">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`material-symbols-outlined text-[18px] ${overallColor}`}>{overallIcon}</span>
                  <span className="text-xs font-semibold text-on-surface">Health Status</span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-on-surface-variant/60">
                    <span className="material-symbols-outlined text-[12px]">sync</span>
                    Synced
                  </span>
                </div>
                <p className={`text-xs font-medium ${overallColor}`}>{overallLabel}</p>
                <div className="mt-2 flex gap-1">
                  {vaccines.slice(0, 6).map((v, i) => {
                    const s = getVaccineStatus(v.nextDueDate);
                    const dotColor = s === 'up-to-date' ? 'bg-secondary' : s === 'due-soon' ? 'bg-amber-500' : s === 'overdue' ? 'bg-error' : 'bg-surface-container-highest';
                    return <div key={i} className={`w-2 h-2 rounded-full ${dotColor}`} title={`${v.name}: ${s}`} />;
                  })}
                </div>
              </div>
            </div>

            {/* ── Mobile Header + Sidebar (visible on small screens) ── */}
            <div className="flex sm:hidden flex-col border-b border-outline-variant shrink-0 bg-surface-container-high">
              {/* Top row: avatar + name + close button */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-primary via-tertiary to-secondary p-[2px] rounded-xl">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-surface-container">
                      {pet.image ? (
                        <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant flex items-center justify-center w-full h-full">pets</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>{pet.name}</h2>
                    <p className="text-xs text-on-surface-variant">
                      {[pet.breed, petAge].filter(Boolean).join(' \u00B7 ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-xl hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Mobile Tabs */}
              <div className="flex px-4 overflow-x-auto">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 py-3 px-2 mr-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px]"
                      style={activeTab === tab.key ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right Content Pane ── */}
            <div className="flex flex-col flex-1 min-w-0 bg-surface-container-lowest">
              {/* Desktop header with title + Add New Record + close */}
              <div className="hidden sm:flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                    {TAB_CONFIG.find(t => t.key === activeTab)?.label}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'vaccines') addVaccine();
                      else if (activeTab === 'visits') addVisit();
                      else addMedication();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-container text-on-primary-container text-xs font-medium hover:brightness-110 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add New Record
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-xl hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">

                <div className="bg-error-container/30 border border-error-container rounded-2xl p-3 mb-6 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5">warning</span>
                  <p className="text-xs text-on-surface-variant font-medium">
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
                    {sortedVaccines.map((vaccine) => {
                      const status = getVaccineStatus(vaccine.nextDueDate);
                      const statusStyle = vaccineStatusIcon(status);
                      return (
                      <div
                        key={vaccine.originalIndex}
                        id={`vaccine-${vaccine.name.replace(/\s+/g, '-')}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, vaccine.originalIndex)}
                        onDragOver={(e) => handleDragOver(e, vaccine.originalIndex)}
                        onDragEnd={handleDragEnd}
                        className="group bg-surface-container rounded-2xl border border-outline-variant transition-all cursor-move hover:border-outline"
                      >
                        {/* Card header row: status icon | name + date | badge + actions */}
                        <div className="flex items-center gap-3 p-4 pb-0">
                          {/* Left: drag handle + circular status icon */}
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant/40 cursor-grab active:cursor-grabbing shrink-0">drag_indicator</span>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${statusStyle.color}`}>
                            <span className="material-symbols-outlined text-[18px]">{statusStyle.icon}</span>
                          </div>

                          {/* Center: vaccine name + administered date */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 group/name">
                              <input
                                type="text"
                                value={vaccine.name}
                                onChange={(e) => updateVaccine(vaccine.originalIndex, 'name', e.target.value)}
                                placeholder="Vaccine name"
                                className={`${inputClass} font-medium !py-1 !px-2 !rounded-lg`}
                              />
                              {VACCINE_INFO[vaccine.name] && (
                                <div className="relative flex items-center">
                                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60 cursor-help">info</span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-inverse-surface text-inverse-on-surface text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/name:opacity-100 group-hover/name:visible transition-all z-50 pointer-events-none">
                                    {VACCINE_INFO[vaccine.name]}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-inverse-surface" />
                                  </div>
                                </div>
                              )}
                            </div>
                            {vaccine.lastDate && (
                              <p className="text-[11px] text-on-surface-variant/70 mt-0.5 ml-2">
                                Administered: {new Date(vaccine.lastDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>

                          {/* Right: status pill + hover-reveal edit + delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StatusBadge status={status} />
                            {['due-soon', 'overdue'].includes(status) && (
                              <button
                                type="button"
                                onClick={() => downloadICS(vaccine)}
                                className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-lg"
                                title="Add Reminder to Calendar"
                              >
                                <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`vaccine-${vaccine.name.replace(/\s+/g, '-')}`);
                                el?.querySelector('input[type="date"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="text-on-surface-variant/0 group-hover:text-on-surface-variant hover:!text-primary transition-all p-1 rounded-lg"
                              title="Edit vaccine details"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeVaccine(vaccine.originalIndex)}
                              className="text-on-surface-variant/0 group-hover:text-on-surface-variant hover:!text-error transition-all p-1 rounded-lg"
                              title="Delete vaccine"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Card footer: next due date + date inputs + interval + actions */}
                        <div className="px-4 pb-4 pt-3 space-y-2">
                          {/* Next due date display */}
                          {vaccine.nextDueDate && (
                            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/80 ml-[52px]">
                              <span className="material-symbols-outlined text-[14px]">event_upcoming</span>
                              Next due: {new Date(vaccine.nextDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}

                          {/* Date grid */}
                          {(() => {
                            const today = new Date().toISOString().split('T')[0];
                            return (
                              <div className="grid grid-cols-2 gap-3 ml-[52px]">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-on-surface-variant">Last Administered</label>
                                    <button type="button" onClick={() => updateVaccine(vaccine.originalIndex, 'lastDate', today)} className="text-xs text-secondary hover:underline">Today</button>
                                  </div>
                                  <input type="date" value={vaccine.lastDate} onChange={(e) => updateVaccine(vaccine.originalIndex, 'lastDate', e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-on-surface-variant">Next Due</label>
                                    <button type="button" onClick={() => updateVaccine(vaccine.originalIndex, 'nextDueDate', today)} className="text-xs text-secondary hover:underline">Today</button>
                                  </div>
                                  <input type="date" value={vaccine.nextDueDate} onChange={(e) => updateVaccine(vaccine.originalIndex, 'nextDueDate', e.target.value)} className={inputClass} />
                                </div>
                              </div>
                            );
                          })()}

                          {/* Interval + Administered Today */}
                          <div className="flex flex-col gap-1.5 ml-[52px]">
                            <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50 shrink-0">refresh</span>
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
                                    className="flex-1 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant text-xs focus:outline-none focus:ring-1 focus:ring-primary"
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
                                      className="w-32 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  )}
                                </>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={() => administeredToday(vaccine.originalIndex)}
                              title="Mark as administered today and auto-calculate next due date"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container hover:brightness-110 transition-colors text-xs font-medium shrink-0"
                            >
                              <span className="material-symbols-outlined text-[14px]">bolt</span> Today
                            </button>
                          </div>{/* end flex items-center row */}
                          </div>{/* end flex-col interval wrapper */}
                        </div>
                      </div>
                      );
                    })}

                    {/* Inline add form — dashed-border card */}
                    <div
                      className="rounded-2xl border-2 border-dashed border-outline-variant p-4 transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-highest/50 shrink-0">
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant/50">add</span>
                        </div>
                        <button
                          type="button"
                          onClick={addVaccine}
                          className="flex-1 text-left text-sm text-on-surface-variant hover:text-primary transition-colors font-medium"
                        >
                          Add Vaccine Entry
                        </button>
                      </div>
                    </div>
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
                      className="w-full py-2.5 rounded-2xl bg-tertiary-container text-on-tertiary-container hover:brightness-110 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span> Log a Vet Visit
                    </button>

                    {visits.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-outline-variant rounded-2xl">
                        <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30 mx-auto mb-2">calendar_month</span>
                        <p className="text-on-surface-variant text-sm font-medium">No visits recorded yet.</p>
                      </div>
                    ) : (
                      visits.map((visit, i) => (
                        <div
                          key={i}
                          className="bg-surface-container rounded-2xl p-4 border border-outline-variant space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-on-surface-variant">Date</span>
                                <button type="button" onClick={() => updateVisit(i, 'date', new Date().toISOString().split('T')[0])} className="text-xs text-secondary hover:underline">Today</button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/50 shrink-0">calendar_month</span>
                                <input type="date" value={visit.date} onChange={(e) => updateVisit(i, 'date', e.target.value)} className={`${inputClass} flex-1`} />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVisit(i)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1 rounded shrink-0 mt-5"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
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
                                    <button type="button" onClick={() => updateVisit(i, 'clinic', hint)} className="text-xs text-secondary hover:underline">{hintLabel}</button>
                                  </div>
                                )}
                                <input type="text" value={visit.clinic} onChange={(e) => updateVisit(i, 'clinic', e.target.value)} placeholder="Clinic / Vet name" className={inputClass} />
                              </div>
                            );
                          })()}
                          <input type="text" value={visit.reason} onChange={(e) => updateVisit(i, 'reason', e.target.value)} placeholder="Reason for visit" className={inputClass} />
                          <div className="relative">
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant/50 absolute left-3 top-2.5 pointer-events-none">description</span>
                            <textarea
                              value={visit.notes}
                              onChange={(e) => updateVisit(i, 'notes', e.target.value)}
                              placeholder="Notes (diagnosis, treatments, follow-ups...)"
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
                      className="w-full py-2.5 rounded-2xl bg-tertiary-container text-on-tertiary-container hover:brightness-110 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span> Add Medication
                    </button>

                    {medications.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-outline-variant rounded-2xl">
                        <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30 mx-auto mb-2">medication</span>
                        <p className="text-on-surface-variant text-sm font-medium">No medications tracked yet.</p>
                        <p className="text-on-surface-variant/60 text-xs mt-1">Add prescriptions, supplements, or ongoing treatments.</p>
                      </div>
                    ) : (
                      medications.map((med) => (
                        <div
                          key={med.id}
                          className="bg-surface-container rounded-2xl p-4 border border-outline-variant space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0">medication</span>
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
                              className="text-on-surface-variant hover:text-error transition-colors p-1 rounded shrink-0"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-on-surface-variant mb-1">Dosage</label>
                              <input
                                type="text"
                                value={med.dosage}
                                onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                                placeholder="e.g., 16mg, 1 tablet"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-on-surface-variant mb-1">Frequency</label>
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
                                <label className="block text-xs font-medium text-on-surface-variant">Start Date</label>
                                <button type="button" onClick={() => updateMedication(med.id, 'startDate', new Date().toISOString().split('T')[0])} className="text-xs text-secondary hover:underline">Today</button>
                              </div>
                              <input type="date" value={med.startDate} onChange={(e) => updateMedication(med.id, 'startDate', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-medium text-on-surface-variant">End Date <span className="font-normal text-on-surface-variant/50">(optional)</span></label>
                                <button type="button" onClick={() => updateMedication(med.id, 'endDate', new Date().toISOString().split('T')[0])} className="text-xs text-secondary hover:underline">Today</button>
                              </div>
                              <input type="date" value={med.endDate} onChange={(e) => updateMedication(med.id, 'endDate', e.target.value)} className={inputClass} />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-on-surface-variant mb-1">Notes</label>
                            <textarea
                              value={med.notes}
                              onChange={(e) => updateMedication(med.id, 'notes', e.target.value)}
                              placeholder="Side effects to watch, administering instructions, prescribing vet..."
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
              <div className="p-5 border-t border-outline-variant shrink-0 bg-surface-container-low/50 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-2xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty}
                  className="flex-1 py-2.5 rounded-2xl bg-primary-container text-on-primary-container disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors hover:brightness-110 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save Records
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
