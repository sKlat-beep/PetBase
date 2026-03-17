import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

interface PetFABProps {
  onClick: () => void;
}

export function PetFAB({ onClick }: PetFABProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-2xl rounded-full p-4"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      aria-label="Add pet"
    >
      <Plus className="w-6 h-6" />
    </motion.button>
  );
}
