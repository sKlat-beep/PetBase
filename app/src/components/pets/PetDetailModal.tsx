import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Pencil,
  AlertTriangle,
  Lock,
  LayoutList,
  Stethoscope,
  Utensils,
  Activity,
  FolderOpen,
} from 'lucide-react';
import type { Pet } from '../../types/pet';
import { formatPetAge } from '../../lib/petAge';
import { isPetFieldPublic } from '../../types/pet';
import { PetDetailSection } from './PetDetailSection';
import { PetOverviewPanel } from './PetOverviewPanel';
import { PetHealthPanel } from './PetHealthPanel';
import { PetDietPanel } from './PetDietPanel';
import { PetActivitiesPanel } from './PetActivitiesPanel';
import { PetDocumentsPanel } from './PetDocumentsPanel';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PetDetailModalProps {
  pet: Pet | null;       // null = modal is closed
  pets: Pet[];           // all pets (for switcher strip)
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (pet: Pet) => void;         // opens PetFormModal
  onMedical?: (pet: Pet) => void;      // opens MedicalRecordsModal
  onToggleLost: (pet: Pet) => void;   // triggers PetLostConfirmModal
  onDelete: (pet: Pet) => void;       // triggers delete confirm
  uid?: string;                       // for localStorage section keys
  isOwner?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarShapeClass(shape: Pet['avatarShape']): string {
  switch (shape) {
    case 'square':   return 'rounded-2xl';
    case 'squircle': return 'rounded-[2.5rem]';
    case 'hexagon':
    // 'hexagon' intentionally unsupported — falls back to circle
    case 'circle':
    default:         return 'rounded-full';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PetDetailModal({
  pet,
  pets,
  isOpen,
  onClose,
  onEdit,
  onMedical,
  onToggleLost,
  onDelete,
  uid,
  isOwner = true,
}: PetDetailModalProps) {
  const [activePet, setActivePet] = useState<Pet | null>(pet);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Sync activePet whenever the pet prop changes (new modal open)
  useEffect(() => {
    if (pet) setActivePet(pet);
  }, [pet]);

  // Fix 1: Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Fix 2: Focus dialog container on open
  useEffect(() => {
    if (isOpen) {
      // small delay to let AnimatePresence complete mount
      const t = setTimeout(() => dialogRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Fix 3: Focus trap — Tab / Shift+Tab stays within dialog
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const container = dialogRef.current;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Fix 5: Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const liveAge = useMemo(
    () => activePet ? formatPetAge(activePet.birthday, activePet.age) : '',
    [activePet?.birthday, activePet?.age]
  );

  if (!isOpen || !pet || !activePet) return null;

  const showSwitcher = pets.length >= 3;
  const ns = uid ?? 'anon';

  const shapeClass = avatarShapeClass(activePet.avatarShape);
  const lostRing = activePet.lostStatus?.isLost
    ? 'ring-2 ring-rose-500 ring-offset-2'
    : '';

  const showField = (key: string) => isOwner !== false || isPetFieldPublic(activePet, key);
  const hasHiddenFields = isOwner === false &&
    ['vaccinations', 'lastVetVisit', 'specialNeeds', 'allergies', 'weight']
      .some(k => !isPetFieldPublic(activePet, k));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop overlay — click-outside closes */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-detail-modal-title"
        tabIndex={-1}
        className="relative bg-white dark:bg-neutral-900 w-full sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col max-h-screen sm:max-h-[90vh] sm:max-w-2xl sm:mx-auto outline-none"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* ── Sticky header ──────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
          {/* Pet switcher strip — Fix 7: role="group" + aria-label */}
          {showSwitcher && (
            <div
              role="group"
              aria-label="Switch pet"
              className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto scrollbar-none"
            >
              {pets.map((p) => {
                const isActive = p.id === activePet.id;
                const pShapeClass = avatarShapeClass(p.avatarShape);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePet(p)}
                    aria-label={`Switch to ${p.name}`}
                    aria-pressed={isActive}
                    className={`flex-shrink-0 w-9 h-9 overflow-hidden transition-all ${pShapeClass} ${
                      isActive
                        ? 'ring-2 ring-neutral-900 dark:ring-neutral-100 ring-offset-1'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover ${pShapeClass}`}
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-base ${pShapeClass}`}
                      >
                        🐾
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Hero row */}
          <div className="flex items-center gap-4 px-6 py-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {activePet.image ? (
                <img
                  src={activePet.image}
                  alt={activePet.name}
                  referrerPolicy="no-referrer"
                  className={`w-16 h-16 object-cover ${shapeClass} ${lostRing}`}
                />
              ) : (
                <div
                  className={`w-16 h-16 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-3xl ${shapeClass} ${lostRing}`}
                >
                  🐾
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Fix 4: id for aria-labelledby */}
                <h2
                  id="pet-detail-modal-title"
                  className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 truncate"
                >
                  {activePet.name}
                </h2>
                {activePet.lostStatus?.isLost && (
                  <span className="text-xs font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">
                    Lost
                  </span>
                )}
                {activePet.isPrivate && (
                  <span className="flex items-center gap-1 text-xs font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" />
                    Private
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {activePet.breed}
                {activePet.type ? ` · ${activePet.type}` : ''}
                {liveAge ? ` · ${liveAge}` : ''}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(activePet)}
                  className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  aria-label={`Edit ${activePet.name}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleLost(activePet)}
                className={`p-2 rounded-xl transition-colors ${
                  activePet.lostStatus?.isLost
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                    : 'text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/20'
                }`}
                aria-label={
                  activePet.lostStatus?.isLost
                    ? `Mark ${activePet.name} as found`
                    : `Report ${activePet.name} as lost`
                }
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {isOwner === false && hasHiddenFields && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 px-4 py-1">
            <Lock className="w-3 h-3" />
            <span>Some fields are private</span>
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePet.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Overview */}
              <PetDetailSection
                title="Overview"
                icon={<LayoutList className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
                defaultOpen={true}
                storageKey={`petbase-detail-sections-${ns}-overview`}
              >
                <PetOverviewPanel
                  pet={activePet}
                  onEdit={onEdit ? () => onEdit(activePet) : undefined}
                />
              </PetDetailSection>

              {/* Health */}
              <PetDetailSection
                title="Health"
                icon={<Stethoscope className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
                defaultOpen={false}
                storageKey={`petbase-detail-sections-${ns}-health`}
              >
                <PetHealthPanel
                  pet={activePet}
                  onMedical={onMedical ? () => onMedical(activePet) : undefined}
                />
              </PetDetailSection>

              {/* Diet */}
              <PetDetailSection
                title="Diet"
                icon={<Utensils className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
                defaultOpen={false}
                storageKey={`petbase-detail-sections-${ns}-diet`}
              >
                <PetDietPanel
                  pet={activePet}
                  onEdit={onEdit ? () => onEdit(activePet) : undefined}
                />
              </PetDetailSection>

              {/* Activities */}
              <PetDetailSection
                title="Activities"
                icon={<Activity className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
                defaultOpen={false}
                storageKey={`petbase-detail-sections-${ns}-activities`}
              >
                <PetActivitiesPanel
                  pet={activePet}
                  onEdit={onEdit ? () => onEdit(activePet) : undefined}
                />
              </PetDetailSection>

              {/* Documents */}
              <PetDetailSection
                title="Documents"
                icon={<FolderOpen className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
                defaultOpen={false}
                storageKey={`petbase-detail-sections-${ns}-documents`}
              >
                <PetDocumentsPanel
                  pet={activePet}
                  onEdit={onEdit ? () => onEdit(activePet) : undefined}
                />
              </PetDetailSection>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Sticky footer ───────────────────────────────────────────────── */}
        <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-700 p-4 flex items-center justify-between">
          {/* Fix 6: aria-label includes pet name */}
          <button
            type="button"
            onClick={() => onDelete(activePet)}
            aria-label={`Delete ${activePet.name}`}
            className="text-rose-600 dark:text-rose-400 text-sm font-medium hover:underline"
          >
            Delete Pet
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
