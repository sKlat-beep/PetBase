import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Camera } from 'lucide-react';
import type { Pet } from '../../types/pet';

interface StoryEntry {
  id: string;
  caption: string;
  imageUrl?: string;
  createdAt: number;
}

const STORIES_KEY = (petId: string) => `petbase-stories-${petId}`;
const DAY_MS = 24 * 60 * 60 * 1000;

function getStories(petId: string): StoryEntry[] {
  try {
    const raw = localStorage.getItem(STORIES_KEY(petId));
    if (!raw) return [];
    const stories: StoryEntry[] = JSON.parse(raw);
    // Filter expired (> 24h)
    return stories.filter(s => Date.now() - s.createdAt < DAY_MS);
  } catch { return []; }
}

function saveStories(petId: string, stories: StoryEntry[]) {
  localStorage.setItem(STORIES_KEY(petId), JSON.stringify(stories));
}

interface StoryRingProps {
  pet: Pet;
  children: React.ReactNode; // avatar element
  size?: number;
}

export function StoryRing({ pet, children, size = 56 }: StoryRingProps) {
  const [stories, setStories] = useState(() => getStories(pet.id));
  const [viewing, setViewing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [caption, setCaption] = useState('');

  const hasStories = stories.length > 0;
  const ringSize = size + 8;

  const handleCreate = () => {
    if (!caption.trim()) return;
    const entry: StoryEntry = {
      id: crypto.randomUUID(),
      caption: caption.trim(),
      createdAt: Date.now(),
    };
    const updated = [entry, ...stories].slice(0, 10);
    setStories(updated);
    saveStories(pet.id, updated);
    setCaption('');
    setCreating(false);
  };

  return (
    <>
      <button
        onClick={() => hasStories ? setViewing(true) : setCreating(true)}
        className="relative flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-full"
        aria-label={hasStories ? `View ${pet.name}'s stories` : `Add story for ${pet.name}`}
      >
        {/* Gradient ring */}
        <div
          className={`rounded-full p-[3px] ${hasStories ? 'bg-gradient-to-br from-rose-500 via-violet-500 to-amber-500' : 'bg-transparent'}`}
          style={{ width: ringSize, height: ringSize }}
        >
          <div className="rounded-full bg-white dark:bg-stone-800 p-[2px] w-full h-full">
            {children}
          </div>
        </div>
        {!hasStories && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-800 flex items-center justify-center">
            <Plus className="w-3 h-3 text-white" />
          </div>
        )}
      </button>

      {/* Story viewer */}
      <AnimatePresence>
        {viewing && stories.length > 0 && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setViewing(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-sm w-full bg-stone-900 rounded-2xl p-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setViewing(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <p className="text-white font-bold text-lg mb-1">{pet.name}</p>
              {stories.map(s => (
                <div key={s.id} className="mb-3">
                  <p className="text-white/90 text-sm">{s.caption}</p>
                  <p className="text-white/40 text-[10px] mt-1">
                    {new Date(s.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              ))}
              <button
                onClick={() => { setViewing(false); setCreating(true); }}
                className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
              >
                Add a story
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Story creator */}
      <AnimatePresence>
        {creating && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setCreating(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-sm w-full bg-white dark:bg-stone-800 rounded-2xl p-5"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-3">
                What's {pet.name} up to?
              </h3>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Share a quick update..."
                maxLength={140}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="flex-1 py-2 text-sm text-stone-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!caption.trim()}
                  className="flex-1 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
                >
                  Share (24h)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
