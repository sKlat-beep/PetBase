import type { Pet } from '../../types/pet';
import { MoodLog } from './MoodLog';

interface PetActivitiesPanelProps {
  pet: Pet;
  onEdit?: () => void;
  onUpdatePet?: (pet: Pet) => void;
}

export function PetActivitiesPanel({ pet, onEdit, onUpdatePet }: PetActivitiesPanelProps) {
  const hasLikes = pet.likes && pet.likes.length > 0;
  const hasDislikes = pet.dislikes && pet.dislikes.length > 0;
  const hasActivities = pet.favoriteActivities && pet.favoriteActivities.length > 0;
  const hasPlay = !!pet.typeOfPlay;

  const isEmpty = !hasLikes && !hasDislikes && !hasActivities && !hasPlay;

  if (isEmpty) {
    return (
      <div className="text-center py-6 text-on-surface-variant">
        <p className="text-sm mb-3">No activities added yet.</p>
        {/* Fix 4: Guard onEdit call */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-on-surface font-semibold underline underline-offset-2"
          >
            Add activities →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Daily Mood Log */}
      {onUpdatePet && <MoodLog pet={pet} onSave={onUpdatePet} />}

      {/* Likes */}
      {hasLikes && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base text-error">favorite</span>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Likes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Fix 5: stable key using item value */}
            {pet.likes!.map((like) => (
              <span
                key={like}
                className="text-xs px-2.5 py-1 rounded-full bg-error-container text-on-error-container"
              >
                {like}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dislikes */}
      {hasDislikes && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base text-on-surface-variant">heart_broken</span>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Dislikes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Fix 5: stable key using item value */}
            {pet.dislikes!.map((dislike) => (
              <span
                key={dislike}
                className="text-xs px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant"
              >
                {dislike}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Favorite Activities */}
      {hasActivities && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base text-amber-500">mood</span>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Activities
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Fix 5: stable key using item value */}
            {pet.favoriteActivities!.map((activity) => (
              <span
                key={activity}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"
              >
                {activity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Type of Play */}
      {hasPlay && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-base text-secondary">bolt</span>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Play Style
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
              {pet.typeOfPlay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
