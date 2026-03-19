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
      <div className="text-center py-6 text-on-surface-variant">
        <p className="text-sm mb-3">No profile info added yet.</p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-on-surface font-semibold underline underline-offset-2"
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
            <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-tertiary-container text-on-tertiary-container border border-outline-variant">
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
              className="bg-surface-container-low rounded-xl px-4 py-3"
            >
              <p className="text-xs text-on-surface-variant mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-on-surface">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Measurements */}
      {hasMeasurements && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
            Measurements
          </p>
          <div className="space-y-1.5">
            {hasHeight && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Height</span>
                <span className="font-medium text-on-surface">
                  {pet.height}{pet.heightUnit ? ` ${pet.heightUnit}` : ''}
                </span>
              </div>
            )}
            {hasLength && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Length</span>
                <span className="font-medium text-on-surface">
                  {pet.length}{pet.lengthUnit ? ` ${pet.lengthUnit}` : ''}
                </span>
              </div>
            )}
            {hasBodyScore && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Body Score</span>
                <span className="font-medium text-on-surface">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Notes
            </p>
            <span className="text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-medium">
              Encrypted
            </span>
          </div>
          <p className="text-sm text-on-surface-variant whitespace-pre-wrap line-clamp-4">
            {pet.notes}
          </p>
        </div>
      )}
    </div>
  );
}
