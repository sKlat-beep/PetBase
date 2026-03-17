import { useState } from 'react';
import { X, ChevronDown, ChevronUp, HelpCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_SECTIONS: { title: string; items: FAQItem[] }[] = [
  {
    title: 'Getting Started',
    items: [
      { q: 'How do I add my first pet?', a: 'Go to the Pets page from the sidebar, then click "Add Pet". Fill in your pet\'s basic info and save.' },
      { q: 'How do I complete the Getting Started guide?', a: 'The guide appears on your Dashboard. Complete each step — or click the X on a step to skip it. Once all steps are done or skipped, the guide is dismissed.' },
      { q: 'Can I use PetBase on multiple devices?', a: 'Yes! Sign in with the same account. Pet profiles and medical records sync via Firestore. Note: expense and activity logs are device-local for privacy.' },
    ],
  },
  {
    title: 'Pet Profiles & Medical Records',
    items: [
      { q: 'How do I add vaccines or medications?', a: 'Open a pet\'s profile, click "Medical Records", then use the Vaccines or Medications tabs to add entries.' },
      { q: 'What does the Body Condition Score mean?', a: 'It indicates your pet\'s weight status: Underweight, Healthy weight, or Overweight. A vet can give you an official assessment.' },
      { q: 'Where is medical data stored?', a: 'Medical records are stored locally on your device (encrypted). They never leave your device unless you use the encrypted backup export.' },
    ],
  },
  {
    title: 'Pet Cards',
    items: [
      { q: 'What is a pet card?', a: 'A shareable digital card with a QR code that lets others view your pet\'s info. You control exactly what fields are visible.' },
      { q: 'How do I revoke a card?', a: 'Go to Cards, select the card, and click "Revoke". The card becomes inactive after a 5-minute grace period.' },
      { q: 'What is a multi-pet card?', a: 'A single card that covers multiple pets — useful for dog walkers or sitters who need info on all your pets at once.' },
    ],
  },
  {
    title: 'Community & Groups',
    items: [
      { q: 'How do I find groups near me?', a: 'Use the Search page and enable location to filter groups and services by proximity.' },
      { q: 'How many groups can I own?', a: 'You can own up to 3 groups simultaneously.' },
      { q: 'Can I pin posts in my group?', a: 'Yes — as a group Owner or Moderator, click the pin icon on any post. Up to 3 posts can be pinned per group.' },
    ],
  },
  {
    title: 'Family Sharing',
    items: [
      { q: 'How do I set up Family Sharing?', a: 'Go to Settings → Family, click "Create Household", then share the 6-character invite code with family members.' },
      { q: 'What roles are available?', a: 'Family Leader (full control), Extended Family (limited access), Child (parental controls apply), and Member (standard access).' },
      { q: 'What does the Family Audit Log show?', a: 'It shows a history of key household actions (member joins, role changes, etc.), visible only to Family Leaders in Settings → Activity.' },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      { q: 'Is my data encrypted?', a: 'Yes. PII fields like address, phone, pet notes, medical records, and expense labels are encrypted with AES-256-GCM before being stored.' },
      { q: 'What is Public vs. Private profile?', a: 'Public profiles show only your display name, pet types, and pet count. All other data is private unless you explicitly opt in to sharing it.' },
      { q: 'How do I export my data?', a: 'Go to Settings → Data & API and use the encrypted backup feature to download a local backup of your data.' },
    ],
  },
];

interface HelpModalProps {
  onClose: () => void;
  onFeedback: () => void;
}

export function HelpModal({ onClose, onFeedback }: HelpModalProps) {
  const [openSection, setOpenSection] = useState<string | null>('Getting Started');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-700 shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-500" />
            <h2 id="help-modal-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Help & FAQ</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {FAQ_SECTIONS.map(section => (
            <div key={section.title} className="border border-neutral-100 dark:border-neutral-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === section.title ? null : section.title)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors"
              >
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">{section.title}</span>
                {openSection === section.title
                  ? <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />}
              </button>

              <AnimatePresence initial={false}>
                {openSection === section.title && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-neutral-100 dark:border-neutral-700 divide-y divide-neutral-50 dark:divide-neutral-700/50">
                      {section.items.map(item => (
                        <div key={item.q}>
                          <button
                            onClick={() => setOpenQuestion(openQuestion === item.q ? null : item.q)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/20 transition-colors gap-3"
                          >
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">{item.q}</span>
                            {openQuestion === item.q
                              ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                          </button>
                          <AnimatePresence initial={false}>
                            {openQuestion === item.q && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <p className="px-4 pb-3 text-sm text-neutral-500 dark:text-neutral-400">{item.a}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-700 shrink-0 text-center">
          <button
            onClick={() => { onClose(); onFeedback(); }}
            className="inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Report an Issue or Provide Feedback
          </button>
        </div>
      </motion.div>
    </div>
  );
}
