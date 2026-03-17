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
      <div className="text-center py-6 text-neutral-500 dark:text-neutral-400">
        <p className="text-sm mb-3">No diet info added yet.</p>
        {/* Fix 4: Guard onEdit call */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-neutral-900 dark:text-neutral-100 font-semibold underline underline-offset-2"
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
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">
            Feeding Schedule
          </p>
          <div className="space-y-3">
            {/* Fix 5: stable key using time+portion */}
            {pet.dietSchedule!.map((entry) => (
              <div key={entry.time + '-' + entry.portion} className="flex items-start gap-3">
                <span className="text-xs font-mono bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded text-neutral-600 dark:text-neutral-300 shrink-0">
                  {entry.time}
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{entry.portion}</p>
                  {entry.brand && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{entry.brand}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food info */}
      {hasFoodInfo && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-2">
            Food
          </p>
          <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl px-4 py-3 space-y-1.5">
            {(pet.food || pet.foodBrand) && (
              <div className="flex justify-between text-sm">
                {/* Fix 7: show "Food" label when only pet.food is present, "Brand" when foodBrand */}
                <span className="text-neutral-500 dark:text-neutral-400">{pet.foodBrand ? 'Brand' : 'Food'}</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {pet.food || pet.foodBrand}
                </span>
              </div>
            )}
            {pet.foodAmount && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Amount</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
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
