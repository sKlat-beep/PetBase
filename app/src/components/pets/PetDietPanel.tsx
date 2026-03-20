import type { Pet } from '../../types/pet';

interface PetDietPanelProps {
  pet: Pet;
  onEdit?: () => void;
}

export function PetDietPanel({ pet, onEdit }: PetDietPanelProps) {
  const hasDietSchedule = pet.dietSchedule && pet.dietSchedule.length > 0;
  const hasFoodInfo = !!(pet.food || pet.foodBrand || pet.foodAmount);

  const isEmpty = !hasDietSchedule && !hasFoodInfo;

  if (isEmpty) {
    return (
      <div className="text-center py-6 text-on-surface-variant">
        <p className="text-sm mb-3">No diet info added yet.</p>
        {/* Fix 4: Guard onEdit call */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-on-surface font-semibold underline underline-offset-2"
          >
            Add diet info →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Diet schedule timeline */}
      {hasDietSchedule && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">
            Feeding Schedule
          </p>
          <div className="space-y-3">
            {pet.dietSchedule!.map((schedule) =>
              schedule.entries.map((entry) => (
                <div key={entry.time + '-' + entry.amount} className="flex items-start gap-3">
                  <span className="text-xs font-mono bg-surface-container px-2 py-1 rounded text-on-surface-variant shrink-0">
                    {entry.time}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{entry.amount} {entry.unit}</p>
                    {schedule.foodType && (
                      <p className="text-xs text-on-surface-variant">{schedule.foodType}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Food info */}
      {hasFoodInfo && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
            Food
          </p>
          <div className="bg-surface-container-low rounded-xl px-4 py-3 space-y-1.5">
            {(pet.food || pet.foodBrand) && (
              <div className="flex justify-between text-sm">
                {/* Fix 7: show "Food" label when only pet.food is present, "Brand" when foodBrand */}
                <span className="text-on-surface-variant">{pet.foodBrand ? 'Brand' : 'Food'}</span>
                <span className="font-medium text-on-surface">
                  {pet.food || pet.foodBrand}
                </span>
              </div>
            )}
            {pet.foodAmount && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Amount</span>
                <span className="font-medium text-on-surface">
                  {pet.foodAmount}{pet.foodUnit ? ` ${pet.foodUnit}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
