import { useState } from 'react';
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
  const [search, setSearch] = useState('');

  const filteredSections = search.trim()
    ? FAQ_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(
          item =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(section => section.items.length > 0)
    : FAQ_SECTIONS;

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
        className="glass-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">help</span>
            <h2
              id="help-modal-title"
              className="text-lg font-semibold text-on-surface"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              Help & FAQ
            </h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-4 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search help topics..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2 custom-scrollbar" style={{ maxHeight: '600px' }}>
          {filteredSections.map(section => (
            <div key={section.title} className="border border-outline-variant rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === section.title ? null : section.title)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-container/50 transition-colors"
              >
                <span className="font-semibold text-on-surface text-sm">{section.title}</span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
                  {openSection === section.title ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openSection === section.title && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-outline-variant divide-y divide-outline-variant/50">
                      {section.items.map(item => (
                        <div key={item.q}>
                          <button
                            onClick={() => setOpenQuestion(openQuestion === item.q ? null : item.q)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container/30 transition-colors gap-3"
                          >
                            <span className="text-sm text-on-surface-variant">{item.q}</span>
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
                              {openQuestion === item.q ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {openQuestion === item.q && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <p className="px-4 pb-3 text-sm text-on-surface-variant/80 border-l-4 border-tertiary ml-4">{item.a}</p>
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

          {filteredSections.length === 0 && (
            <div className="text-center py-8 text-on-surface-variant text-sm">
              No results found for "{search}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant shrink-0 text-center">
          <p className="text-xs text-on-surface-variant mb-2">Still need help?</p>
          <button
            onClick={() => { onClose(); onFeedback(); }}
            className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">mail</span>
            Contact Support
          </button>
        </div>
      </motion.div>
    </div>
  );
}
