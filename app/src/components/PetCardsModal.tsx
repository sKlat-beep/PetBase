import { AnimatePresence, motion } from 'motion/react';
import { Cards } from '../pages/Cards';

interface PetCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PetCardsModal({ isOpen, onClose }: PetCardsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center" role="dialog" aria-modal="true" aria-labelledby="pet-cards-title">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-scrim/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative z-10 w-full max-w-4xl mx-4 mt-8 mb-8 max-h-[calc(100vh-4rem)] bg-surface rounded-3xl shadow-2xl border border-outline-variant flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
              <h2 className="text-lg font-bold text-on-surface">Identity Cards</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
                aria-label="Close identity cards"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <Cards />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
