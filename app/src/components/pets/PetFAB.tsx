import { motion } from 'motion/react';

interface PetFABProps {
  onClick: () => void;
}

export function PetFAB({ onClick }: PetFABProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-primary text-on-primary shadow-2xl rounded-full p-4"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      aria-label="Add pet"
    >
      <span className="material-symbols-outlined text-2xl">add</span>
    </motion.button>
  );
}
