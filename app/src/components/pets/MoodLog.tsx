import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Pet } from '../../types/pet';

type Mood = 'happy' | 'calm' | 'energetic' | 'restless' | 'sick';

const MOOD_OPTIONS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'energetic', emoji: '⚡', label: 'Energetic' },
  { value: 'restless', emoji: '😤', label: 'Restless' },
  { value: 'sick', emoji: '🤒', label: 'Sick' },
];

const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;

interface MoodLogProps {
  pet: Pet;
  onSave: (pet: Pet) => void;
}

export function MoodLog({ pet, onSave }: MoodLogProps) {
  const [showForm, setShowForm] = useState(false);
  const [mood, setMood] = useState<Mood>('happy');
  const [energy, setEnergy] = useState(3);
  const [notes, setNotes] = useState('');

  const moodLog = pet.moodLog ?? [];
  const today = new Date().toISOString().split('T')[0];
  const todayEntry = moodLog.find(e => e.date === today);

  const handleSubmit = useCallback(() => {
    const entry = { date: today, mood, energy, ...(notes.trim() ? { notes: notes.trim() } : {}) };
    const updated = [entry, ...moodLog.filter(e => e.date !== today)].slice(0, 90); // 90 days
    onSave({ ...pet, moodLog: updated });
    setShowForm(false);
    setNotes('');
  }, [today, mood, energy, notes, moodLog, pet, onSave]);

  const moodEmoji = (m: Mood) => MOOD_OPTIONS.find(o => o.value === m)?.emoji ?? '😊';

  return (
    <div className="space-y-3">
      {/* Today's check-in */}
      {todayEntry ? (
        <div className="flex items-center gap-3 p-3 bg-tertiary-container rounded-xl border border-outline-variant">
          <span className="text-2xl">{moodEmoji(todayEntry.mood)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface capitalize">{todayEntry.mood}</p>
            <p className="text-xs text-on-surface-variant">
              Energy: {'●'.repeat(todayEntry.energy)}{'○'.repeat(5 - todayEntry.energy)}
            </p>
          </div>
          <span className="text-xs text-on-surface-variant">Today</span>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-outline-variant text-on-surface-variant hover:border-tertiary hover:text-tertiary transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-base">add</span> Daily check-in for {pet.name}
        </button>
      )}

      {/* Check-in form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-on-surface">How is {pet.name} feeling?</p>
                <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* Mood selector */}
              <div className="flex gap-2">
                {MOOD_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setMood(o.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 ${
                      mood === o.value
                        ? 'bg-tertiary-container ring-2 ring-tertiary'
                        : 'hover:bg-surface-container'
                    }`}
                  >
                    <span className="text-xl">{o.emoji}</span>
                    <span className="text-xs text-on-surface-variant">{o.label}</span>
                  </button>
                ))}
              </div>

              {/* Energy level */}
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Energy Level</p>
                <div className="flex gap-1">
                  {ENERGY_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setEnergy(level)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        energy >= level
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Quick note (optional)"
                maxLength={100}
                className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant"
              />

              <button
                onClick={handleSubmit}
                className="w-full py-2 bg-tertiary text-on-tertiary rounded-xl text-sm font-medium hover:bg-tertiary/90 transition-colors"
              >
                Save Check-in
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent history */}
      {moodLog.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-on-surface-variant">Recent</p>
          {moodLog.slice(0, 7).filter(e => e.date !== today).map(entry => (
            <div key={entry.date} className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span>{moodEmoji(entry.mood)}</span>
              <span className="capitalize">{entry.mood}</span>
              <span className="text-outline">·</span>
              <span>Energy {entry.energy}/5</span>
              <span className="ml-auto text-xs">
                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
