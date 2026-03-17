import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Pencil, Syringe, Cake, Lock, Zap } from 'lucide-react';
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
  onEdit: (pet: Pet) => void;
  onMedical: (pet: Pet) => void;
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
    vaccineStatus === 'overdue'  ? 'bg-rose-500'  :
    vaccineStatus === 'due-soon' ? 'bg-amber-500' :
    'bg-emerald-500';

  const shapeClass = avatarShapeClass(pet.avatarShape);
  const lostRing = pet.lostStatus?.isLost
    ? 'ring-2 ring-rose-500 ring-offset-2 animate-pulse'
    : '';

  return (
    <motion.div
      className={`bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl p-4 flex flex-col gap-3 shadow-sm${isBirthdayToday ? ' ring-2 ring-amber-400 ring-offset-2' : ''}`}
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
              className={`w-14 h-14 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-2xl ${shapeClass} ${lostRing}`}
            >
              🐾
            </div>
          )}
          {/* Vaccine status dot */}
          {showVaccineDot && (
            <span
              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-neutral-800 ${vaccineDotClass}`}
            />
          )}
        </StoryRing>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {pet.name}
            </span>
            {isBirthdayToday && (
              <span title="Happy Birthday!" className="flex-shrink-0" aria-label="birthday">🎂</span>
            )}
            {pet.isPrivate && (
              <Lock className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
            )}
            {isBirthdayNear && !isBirthdayToday && (
              <span title="Birthday coming up!" className="flex-shrink-0">
                <Cake className="w-3.5 h-3.5 text-rose-400" />
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {pet.breed}{pet.type ? ` · ${pet.type}` : ''}
          </p>
          {liveAge && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{liveAge}</p>
          )}
        </div>
      </div>

      {/* Ephemeral Status */}
      {pet.ephemeralStatus && (!pet.ephemeralStatusExpiresAt || pet.ephemeralStatusExpiresAt > Date.now()) && (
        <div className="mt-2 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700">
          <p className="text-xs text-violet-700 dark:text-violet-300">{pet.ephemeralStatus}</p>
        </div>
      )}

      {/* Status Tags */}
      {pet.statusTags && pet.statusTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {pet.statusTags.map(tag => (
            <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-1 border-t border-neutral-100 dark:border-neutral-700 pt-2 relative">
        {onSetStatus && (
          <div className="relative">
            <button
              onClick={() => setStatusMenuOpen(v => !v)}
              className="p-2 rounded-xl text-neutral-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:bg-violet-900/20 transition-colors"
              aria-label={`Set status for ${pet.name}`}
            >
              <Zap className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {statusMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute bottom-full right-0 mb-1 w-44 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-xl shadow-lg z-20 py-1 overflow-hidden"
                >
                  {pet.ephemeralStatus && (
                    <button
                      onClick={() => { onSetStatus(pet, undefined); setStatusMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                    >
                      Clear status
                    </button>
                  )}
                  {QUICK_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => { onSetStatus(pet, s); setStatusMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
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
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          aria-label={`View ${pet.name}`}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => onEdit(pet)}
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          aria-label={`Edit ${pet.name}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onMedical(pet)}
          className="p-2 rounded-xl text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-900/20 transition-colors"
          aria-label={`Medical records for ${pet.name}`}
        >
          <Syringe className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
});
