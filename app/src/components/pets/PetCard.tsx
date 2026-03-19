import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Pet } from '../../contexts/PetContext';
import { overallVaccineStatus } from '../../components/MedicalRecordsModal';
import { formatPetAge } from '../../lib/petAge';
import { StoryRing } from './StoryRing';

const QUICK_STATUSES = [
  'At the vet 🏥',
  'Grooming day 💇',
  'Just ate 🍖',
  'Nap time 😴',
  'Out for a walk 🐕',
  'Playtime! 🎾',
];

interface PetCardProps {
  pet: Pet;
  onViewDetail: (pet: Pet) => void;
  onEdit?: (pet: Pet) => void;
  onMedical?: (pet: Pet) => void;
  onSetStatus?: (pet: Pet, status: string | undefined) => void;
}

function avatarShapeClass(shape: Pet['avatarShape']): string {
  switch (shape) {
    case 'square':   return 'rounded-2xl';
    case 'squircle': return 'rounded-[2.5rem]';
    case 'circle':
    // 'hexagon' is intentionally unsupported in card view — falls back to circle
    case 'hexagon':
    default:         return 'rounded-full';
  }
}

export const PetCard = React.memo(function PetCard({ pet, onViewDetail, onEdit, onMedical, onSetStatus }: PetCardProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const liveAge = useMemo(
    () => formatPetAge(pet.birthday, pet.age),
    [pet.birthday, pet.age]
  );

  const isBirthdayNear = useMemo(() => {
    if (!pet.birthday) return false;
    const birth = new Date(pet.birthday);
    const today = new Date();
    const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    const diff = (thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    const nextYearBday = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
    const diffNext = (nextYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return (diff >= 0 && diff <= 7) || (diffNext >= 0 && diffNext <= 7);
  }, [pet.birthday]);

  const isBirthdayToday = useMemo(() => {
    if (!pet.birthday) return false;
    const today = new Date();
    const [, m, d] = pet.birthday.split('-').map(Number);
    return m === today.getMonth() + 1 && d === today.getDate();
  }, [pet.birthday]);

  // vaccines are stored on the Firestore pet doc but not yet in the Pet type — per plan, pet.ts is read-only
  const vaccineStatus = overallVaccineStatus((pet as any).vaccines ?? []);
  const showVaccineDot = vaccineStatus !== 'unknown';

  const vaccineDotClass =
    vaccineStatus === 'overdue'  ? 'bg-error'  :
    vaccineStatus === 'due-soon' ? 'bg-amber-500' :
    'bg-primary';

  const shapeClass = avatarShapeClass(pet.avatarShape);
  const lostRing = pet.lostStatus?.isLost
    ? 'ring-2 ring-error ring-offset-2 animate-pulse'
    : '';

  return (
    <motion.div
      className={`bg-surface-container-low/80 backdrop-blur-sm rounded-2xl p-4 flex flex-col gap-3 shadow-sm${isBirthdayToday ? ' ring-2 ring-amber-400 ring-offset-2' : ''}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar row */}
      <div className="flex items-center gap-3">
        <StoryRing pet={pet} size={56}>
          {pet.image ? (
            <img
              src={pet.image}
              alt={pet.name}
              referrerPolicy="no-referrer"
              className={`w-14 h-14 object-cover ${shapeClass} ${lostRing}`}
            />
          ) : (
            <div
              className={`w-14 h-14 bg-surface-container flex items-center justify-center text-2xl ${shapeClass} ${lostRing}`}
            >
              🐾
            </div>
          )}
          {/* Vaccine status dot */}
          {showVaccineDot && (
            <span
              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-surface ${vaccineDotClass}`}
            />
          )}
        </StoryRing>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-on-surface truncate">
              {pet.name}
            </span>
            {isBirthdayToday && (
              <span title="Happy Birthday!" className="flex-shrink-0" aria-label="birthday">🎂</span>
            )}
            {pet.isPrivate && (
              <span className="material-symbols-outlined text-sm text-on-surface-variant flex-shrink-0">lock</span>
            )}
            {isBirthdayNear && !isBirthdayToday && (
              <span title="Birthday coming up!" className="flex-shrink-0">
                <span className="material-symbols-outlined text-sm text-error">cake</span>
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant truncate">
            {pet.breed}{pet.type ? ` · ${pet.type}` : ''}
          </p>
          {liveAge && (
            <p className="text-xs text-on-surface-variant">{liveAge}</p>
          )}
        </div>
      </div>

      {/* Ephemeral Status */}
      {pet.ephemeralStatus && (!pet.ephemeralStatusExpiresAt || pet.ephemeralStatusExpiresAt > Date.now()) && (
        <div className="mt-2 px-2.5 py-1 rounded-lg bg-tertiary-container border border-outline-variant">
          <p className="text-xs text-on-tertiary-container">{pet.ephemeralStatus}</p>
        </div>
      )}

      {/* Status Tags */}
      {pet.statusTags && pet.statusTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {pet.statusTags.map(tag => (
            <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-secondary-container text-on-secondary-container border border-outline-variant">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-1 border-t border-outline-variant pt-2 relative">
        {onSetStatus && (
          <div className="relative">
            <button
              onClick={() => setStatusMenuOpen(v => !v)}
              className="p-2 rounded-xl text-on-surface-variant hover:text-tertiary hover:bg-tertiary-container transition-colors"
              aria-label={`Set status for ${pet.name}`}
            >
              <span className="material-symbols-outlined text-base">bolt</span>
            </button>
            <AnimatePresence>
              {statusMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute bottom-full right-0 mb-1 w-44 bg-surface-container-low border border-outline-variant rounded-xl shadow-lg z-20 py-1 overflow-hidden"
                >
                  {pet.ephemeralStatus && (
                    <button
                      onClick={() => { onSetStatus(pet, undefined); setStatusMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs text-error hover:bg-surface-container"
                    >
                      Clear status
                    </button>
                  )}
                  {QUICK_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => { onSetStatus(pet, s); setStatusMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <button
          onClick={() => onViewDetail(pet)}
          className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          aria-label={`View ${pet.name}`}
        >
          <span className="material-symbols-outlined text-base">visibility</span>
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(pet)}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label={`Edit ${pet.name}`}
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
        )}
        {onMedical && (
          <button
            onClick={() => onMedical(pet)}
            className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
            aria-label={`Medical records for ${pet.name}`}
          >
            <span className="material-symbols-outlined text-base">syringe</span>
          </button>
        )}
      </div>
    </motion.div>
  );
});
