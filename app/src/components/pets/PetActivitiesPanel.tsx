import { Heart, Smile, Zap } from 'lucide-react';
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
      <div className="text-center py-6 text-stone-500 dark:text-stone-400">
        <p className="text-sm mb-3">No activities added yet.</p>
        {/* Fix 4: Guard onEdit call */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-stone-900 dark:text-stone-100 font-semibold underline underline-offset-2"
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
            <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Likes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Fix 5: stable key using item value */}
            {pet.likes!.map((like) => (
              <span
                key={like}
                className="text-xs px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"
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
            <Heart className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Dislikes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Fix 5: stable key using item value */}
            {pet.dislikes!.map((dislike) => (
              <span
                key={dislike}
                className="text-xs px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
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
            <Smile className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Activities
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Fix 5: stable key using item value */}
            {pet.favoriteActivities!.map((activity) => (
              <span
                key={activity}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
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
            <Zap className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Play Style
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
              {pet.typeOfPlay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
