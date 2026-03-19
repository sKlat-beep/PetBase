import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CreateGroupModal } from '../CreateGroupModal';

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

export default function CommunityFAB() {
  const [open, setOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const rafRef = useRef<number>(0);

  const handleFindFriends = useCallback(() => {
    setOpen(false);
    scrollToSection('community-section-people');
    // Wait for scroll to settle, then trigger search UI
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTimeout(() => {
        const searchBtn = document.querySelector<HTMLButtonElement>('[aria-label="Find people"]');
        if (searchBtn) searchBtn.click();
        setTimeout(() => {
          const searchInput = document.getElementById('community-people-search');
          if (searchInput) searchInput.focus();
        }, 300);
      }, 400);
    });
  }, []);

  const actions = [
    {
      label: 'Create Group',
      icon: 'group',
      color: 'bg-primary hover:bg-primary/90 text-on-primary',
      onClick: () => { setOpen(false); setShowCreateGroup(true); },
    },
    {
      label: 'Find Friends',
      icon: 'person_add',
      color: 'bg-tertiary hover:bg-tertiary/90 text-on-tertiary',
      onClick: handleFindFriends,
    },
    {
      label: 'Post in a Group',
      icon: 'forum',
      color: 'bg-sky-600 hover:bg-sky-700 text-white',
      onClick: () => {
        setOpen(false);
        scrollToSection('community-section-groups');
      },
    },
  ];

  return (
    <>
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {open && actions.map((action, i) => {
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
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{action.icon}</span>
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
          className="w-14 h-14 rounded-full bg-on-surface text-surface shadow-xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          aria-label={open ? 'Close community actions' : 'Open community actions'}
          aria-expanded={open}
        >
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
            {open ? <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span> : <span className="material-symbols-outlined text-[24px]" aria-hidden="true">add</span>}
          </motion.div>
        </motion.button>
      </div>

      {showCreateGroup && createPortal(<CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />, document.body)}
    </>
  );
}
