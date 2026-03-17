import type { Pet } from '../../types/pet';

interface PetOverviewPanelProps {
  pet: Pet;
  onEdit?: () => void;
}

export function PetOverviewPanel({ pet, onEdit }: PetOverviewPanelProps) {
  const hasWeight = !!pet.weight;
  const hasActivity = !!pet.activity;
  const hasSpayedNeutered = !!pet.spayedNeutered;
  const hasHeight = !!pet.height;
  const hasLength = !!pet.length;
  const hasBodyScore = !!pet.bodyConditionScore;
  const hasNotes = !!pet.notes;

  const hasStatusTags = !!(pet.statusTags && pet.statusTags.length > 0);

  const isEmpty =
    !hasWeight &&
    !hasActivity &&
    !hasHeight &&
    !hasLength &&
    !hasBodyScore &&
    !hasNotes &&
    !hasSpayedNeutered &&
    !hasStatusTags;

  if (isEmpty) {
    return (
      <div className="text-center py-6 text-stone-500 dark:text-stone-400">
        <p className="text-sm mb-3">No profile info added yet.</p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-stone-900 dark:text-stone-100 font-semibold underline underline-offset-2"
          >
            Complete pet profile →
          </button>
        )}
      </div>
    );
  }

  const statTiles = [
    hasWeight && { label: 'Weight', value: `${pet.weight}${pet.weightUnit ? ` ${pet.weightUnit}` : ''}` },
    hasActivity && { label: 'Activity', value: pet.activity! },
    hasSpayedNeutered && { label: 'Spayed / Neutered', value: pet.spayedNeutered! },
  ].filter(Boolean) as { label: string; value: string }[];

  const hasMeasurements = hasHeight || hasLength || hasBodyScore;

  return (
    <div className="space-y-4">
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

      {/* Stats grid */}
      {statTiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {statTiles.map(({ label, value }) => (
            <div
              key={label}
              className="bg-stone-50 dark:bg-stone-700/50 rounded-xl px-4 py-3"
            >
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Measurements */}
      {hasMeasurements && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-2">
            Measurements
          </p>
          <div className="space-y-1.5">
            {hasHeight && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500 dark:text-stone-400">Height</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {pet.height}{pet.heightUnit ? ` ${pet.heightUnit}` : ''}
                </span>
              </div>
            )}
            {hasLength && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500 dark:text-stone-400">Length</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {pet.length}{pet.lengthUnit ? ` ${pet.lengthUnit}` : ''}
                </span>
              </div>
            )}
            {hasBodyScore && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500 dark:text-stone-400">Body Score</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {pet.bodyConditionScore}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {hasNotes && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Notes
            </p>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
              Encrypted
            </span>
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap line-clamp-4">
            {pet.notes}
          </p>
        </div>
      )}
    </div>
  );
}
