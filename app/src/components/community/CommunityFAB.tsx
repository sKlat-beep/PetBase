import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, UserPlus, MessagesSquare, X } from 'lucide-react';
import { CreateGroupModal } from '../CreateGroupModal';

export default function CommunityFAB() {
  const [open, setOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const actions = [
    {
      label: 'Create Group',
      icon: Users,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      onClick: () => { setOpen(false); setShowCreateGroup(true); },
    },
    {
      label: 'Find Friends',
      icon: UserPlus,
      color: 'bg-violet-600 hover:bg-violet-700 text-white',
      onClick: () => {
        setOpen(false);
        document.getElementById('community-section-people')?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          const searchBtn = document.querySelector<HTMLButtonElement>('[aria-label="Find people"]');
          if (searchBtn) searchBtn.click();
          setTimeout(() => document.getElementById('community-people-search')?.focus(), 300);
        }, 500);
      },
    },
    {
      label: 'Post in a Group',
      icon: MessagesSquare,
      color: 'bg-sky-600 hover:bg-sky-700 text-white',
      onClick: () => {
        setOpen(false);
        document.getElementById('community-section-groups')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  return (
    <>
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {open && actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${action.color}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {action.label}
              </motion.button>
            );
          })}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen(o => !o)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-14 h-14 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          aria-label={open ? 'Close community actions' : 'Open community actions'}
          aria-expanded={open}
        >
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
            {open ? <X className="w-6 h-6" aria-hidden="true" /> : <Plus className="w-6 h-6" aria-hidden="true" />}
          </motion.div>
        </motion.button>
      </div>

      {showCreateGroup && createPortal(<CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />, document.body)}
    </>
  );
}
