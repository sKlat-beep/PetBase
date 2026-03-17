import { useState } from 'react';

const CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀','😂','🥰','😍','😎','🤔','😭','😡','🙄','😴','🤣','😘','🥺','😏','🤗','🫡'],
  },
  {
    label: 'Animals',
    emojis: ['🐾','🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐸','🐦','🐠','🦋','🦮','🐈','🐇','🦎'],
  },
  {
    label: 'Food',
    emojis: ['🦴','🍖','🥩','🐟','🥕','🌽','🍎','🍕','🍔','🍦','🎂','☕','🍩','🍗','🥦','🧁'],
  },
  {
    label: 'Activities',
    emojis: ['⚽','🎾','🏃','🏊','🎮','🎨','🎵','🏆','🎯','🧩','🎸','⛷️','🏋️','🚴','🤸','🐕'],
  },
  {
    label: 'Objects',
    emojis: ['❤️','🔥','⭐','💫','✨','🎉','🎁','💡','📷','🏠','💊','🩺','📱','🔑','🎀','🌈'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />

      {/* Picker card */}
      <div className="absolute bottom-full mb-2 left-0 z-30 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl p-3 w-72">
        {/* Category tabs */}
        <div className="flex gap-1 mb-2 overflow-x-auto">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              className={`shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-colors
                ${activeCategory === i
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="grid grid-cols-6 gap-0.5">
          {CATEGORIES[activeCategory].emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose(); }}
              className="text-lg p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
