import { AnimatePresence, motion } from 'motion/react';
import { ProfileSettings } from '../pages/ProfileSettings';
import { useAuth } from '../contexts/AuthContext';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { signOut } = useAuth();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
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
            className="relative z-10 w-full max-w-2xl mx-4 mt-8 mb-8 max-h-[calc(100vh-4rem)] bg-surface rounded-3xl shadow-2xl border border-outline-variant flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
              <h2 className="text-lg font-bold text-on-surface">Settings</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { await signOut(); onClose(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-error hover:bg-error-container/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign Out
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
                  aria-label="Close settings"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <ProfileSettings />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
