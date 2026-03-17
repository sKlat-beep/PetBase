import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check } from 'lucide-react';

interface GroupRetentionModalProps {
  currentDays: number;
  onSave: (days: number) => void;
  onClose: () => void;
}

const OPTIONS = [
  { days: 30,  label: '30 days',  sublabel: 'Short-lived discussions' },
  { days: 90,  label: '90 days',  sublabel: 'Seasonal groups' },
  { days: 180, label: '180 days', sublabel: 'Most groups' },
  { days: 365, label: '365 days', sublabel: 'Default' },
] as const;

export function GroupRetentionModal({ currentDays, onSave, onClose }: GroupRetentionModalProps) {
  const [selected, setSelected] = useState(currentDays);

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="retention-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative w-full sm:max-w-md bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-1 bg-stone-300 dark:bg-stone-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 id="retention-modal-title" className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Group Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
          </button>
        </div>

        <div className="h-px bg-stone-100 dark:bg-stone-800" />

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-stone-400 dark:text-stone-500 uppercase mb-1">
              Message Retention
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Posts older than the selected period are automatically deleted.
            </p>
          </div>

          <div className="space-y-2" role="radiogroup" aria-label="Retention period">
            {OPTIONS.map(({ days, label, sublabel }) => {
              const isSelected = selected === days;
              return (
                <button
                  key={days}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelected(days)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500 dark:border-emerald-600'
                      : 'bg-stone-50 dark:bg-stone-800/50 border border-transparent hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-800 dark:text-stone-200'}`}>
                    {label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs ${isSelected ? 'text-emerald-600 dark:text-emerald-500' : 'text-stone-400 dark:text-stone-500'}`}>
                      {sublabel}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[44px]"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}
