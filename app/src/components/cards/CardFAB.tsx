import { motion, AnimatePresence } from 'motion/react';

interface CardFABProps {
  onCreateSingle: () => void;
  onCreateMulti?: () => void;
  showMulti: boolean;
}

export function CardFAB({ onCreateSingle, onCreateMulti, showMulti }: CardFABProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {showMulti && onCreateMulti && (
          <motion.button
            key="multi"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={onCreateMulti}
            className="flex items-center gap-2 bg-tertiary text-on-tertiary shadow-xl rounded-full px-4 py-3 font-medium text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            aria-label="Create multi-pet card"
          >
            <span className="material-symbols-outlined text-[20px] motion-safe:block">layers</span> Multi-pet
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onCreateSingle}
        className="bg-on-surface text-surface shadow-2xl rounded-full p-4"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label="Create new card"
      >
        <span className="material-symbols-outlined text-[24px] motion-safe:block">qr_code_2</span>
      </motion.button>
    </div>
  );
}
