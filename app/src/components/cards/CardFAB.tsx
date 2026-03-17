import { motion, AnimatePresence } from 'motion/react';
import { Layers, QrCode } from 'lucide-react';

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
            className="flex items-center gap-2 bg-violet-600 text-white shadow-xl rounded-full px-4 py-3 font-medium text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            aria-label="Create multi-pet card"
          >
            <Layers className="w-5 h-5 motion-safe:block" /> Multi-pet
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onCreateSingle}
        className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-2xl rounded-full p-4"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label="Create new card"
      >
        <QrCode className="w-6 h-6 motion-safe:block" />
      </motion.button>
    </div>
  );
}
