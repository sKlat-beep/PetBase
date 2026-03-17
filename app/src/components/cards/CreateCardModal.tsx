// app/src/components/cards/CreateCardModal.tsx
// Default export for React.lazy — single-pet card creation/edit modal.

import React, { useState, useRef, useMemo, useEffect, type ReactNode } from 'react';
import { motion, Reorder } from 'motion/react';
import {
  QrCode, Clock, Info, Utensils, Phone, HeartPulse, Syringe, Shield, Heart, GripVertical,
} from 'lucide-react';
import type { Pet } from '../../types/pet';
import {
  TEMPLATE_DEFAULTS,
  TEMPLATE_LABELS,
  CUSTOM_TEMPLATE_KEY,
  type SharingToggles,
  type CardTemplate,
  type PetCard,
} from '../../types/cardExtensions';
import { markCardCreated } from '../GettingStartedGuide';

// ─── Local SHARING_FIELDS (icons can't live in cardExtensions.ts) ──────────────

const SHARING_FIELDS: { key: keyof SharingToggles; label: string; icon: ReactNode }[] = [
  { key: 'basicInfo', label: 'Pet Description', icon: <Info className="w-3.5 h-3.5" /> },
  { key: 'diet', label: 'Health & Diet', icon: <Utensils className="w-3.5 h-3.5" /> },
  { key: 'emergencyContact', label: 'Emergency Contact', icon: <Phone className="w-3.5 h-3.5" /> },
  { key: 'medicalOverview', label: 'Medical Notes', icon: <HeartPulse className="w-3.5 h-3.5" /> },
  { key: 'medications', label: 'Medications', icon: <Syringe className="w-3.5 h-3.5" /> },
  { key: 'microchip', label: 'Microchip ID', icon: <Shield className="w-3.5 h-3.5" /> },
  { key: 'personalityPlay', label: 'Personality & Play', icon: <Heart className="w-3.5 h-3.5" /> },
  { key: 'vaccineRecords', label: 'Vaccine Records', icon: <Syringe className="w-3.5 h-3.5" /> },
  { key: 'vetInfo', label: 'Vet Info', icon: <HeartPulse className="w-3.5 h-3.5" /> },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateCardModalProps {
  pets: Pet[];
  onClose: () => void;
  onCreate: (card: PetCard) => void;
  generalInfoText: string;
  editCard?: PetCard;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateCardModal({
  pets,
  onClose,
  onCreate,
  generalInfoText,
  editCard,
}: CreateCardModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const savedCustomTemplate = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_TEMPLATE_KEY) || 'null') as { sharing: SharingToggles; includeGeneralInfo: boolean; customDays: number; customHours: number } | null; }
    catch { return null; }
  }, []);

  const [selectedPetId, setSelectedPetId] = useState(editCard?.petId || pets[0]?.id || '');
  const [template, setTemplate] = useState<CardTemplate>(editCard?.template || 'vet');
  const [customDays, setCustomDays] = useState(() => {
    if (editCard) return Math.max(0, Math.floor((editCard.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
    return 365;
  });
  const [customHours, setCustomHours] = useState(() => {
    if (editCard) return Math.max(0, Math.floor(((editCard.expiresAt - Date.now()) / (1000 * 60 * 60)) % 24));
    return 0;
  });
  const [sharing, setSharing] = useState<SharingToggles>(() => {
    if (editCard) return { ...editCard.sharing } as SharingToggles;
    return { ...TEMPLATE_DEFAULTS.vet };
  });
  const [includeGeneralInfo, setIncludeGeneralInfo] = useState(() => {
    if (editCard) return editCard.includeGeneralInfo ?? false;
    return false;
  });
  const [customTemplateSaved, setCustomTemplateSaved] = useState(() => {
    const initTemplate = editCard?.template || 'vet';
    return initTemplate !== 'custom' && initTemplate !== 'emergency';
  });
  const [sortableOrder, setSortableOrder] = useState<string[]>(() => {
    if (editCard?.fieldOrder) return editCard.fieldOrder;
    return SHARING_FIELDS.map(f => f.key as string);
  });

  // Focus trap + Escape key
  useEffect(() => {
    const container = modalRef.current;
    if (!container) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleTemplateChange = (t: CardTemplate) => {
    setTemplate(t);
    if (t === 'custom' || t === 'emergency') {
      setSharing(savedCustomTemplate?.sharing ?? { ...TEMPLATE_DEFAULTS.custom });
      setIncludeGeneralInfo(savedCustomTemplate?.includeGeneralInfo ?? false);
      if (!editCard) {
        setCustomDays(savedCustomTemplate?.customDays ?? 0);
        setCustomHours(savedCustomTemplate?.customHours ?? 8);
      }
      setCustomTemplateSaved(false);
    } else {
      setSharing({ ...TEMPLATE_DEFAULTS[t] });
      setIncludeGeneralInfo(t === 'sitter');
      if (!editCard) {
        setCustomDays(t === 'vet' ? 365 : 0);
        setCustomHours(t === 'vet' ? 0 : 8);
      }
      setCustomTemplateSaved(true);
    }
  };

  const handleSaveCustomTemplate = () => {
    const tplData = { sharing: { ...sharing }, includeGeneralInfo, customDays, customHours };
    localStorage.setItem(CUSTOM_TEMPLATE_KEY, JSON.stringify(tplData));
    setCustomTemplateSaved(true);
  };

  const handleCreate = () => {
    const totalHours = Math.max(8, customDays * 24 + customHours);
    const expiresAt = Date.now() + totalHours * 60 * 60 * 1000;

    const newCard: PetCard = {
      id: editCard?.id || crypto.randomUUID(),
      petId: selectedPetId,
      template,
      createdAt: editCard?.createdAt || Date.now(),
      expiresAt,
      status: editCard?.status || 'active',
      sharing,
      includeGeneralInfo: includeGeneralInfo && !!generalInfoText,
      fieldOrder: sortableOrder,
    };
    onCreate(newCard);
    markCardCreated();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center items-end justify-center sm:p-4 p-0 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-card-modal-title"
        className="bg-white dark:bg-neutral-900 sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full sm:max-w-lg overflow-hidden"
      >
        <div className="bg-neutral-900 dark:bg-neutral-950 p-5">
          <h2 id="create-card-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" /> {editCard ? 'Edit Pet Card' : 'Create Pet Card'}
          </h2>
          <p className="text-neutral-400 text-sm mt-1">{editCard ? 'Update sharing options and validity.' : 'Choose your pet, template, and sharing options.'}</p>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Pet select */}
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">Pet</label>
            <select
              value={selectedPetId}
              disabled={!!editCard}
              onChange={e => setSelectedPetId(e.target.value)}
              className="w-full border border-neutral-200 dark:border-neutral-600 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-700 focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
            >
              {pets.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Template */}
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">Card Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['vet', 'sitter', 'custom'] as CardTemplate[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleTemplateChange(t)}
                  className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${template === t
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'}`}
                >
                  {TEMPLATE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Expiration (Min 8 hours)
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-neutral-500 mb-1 block">Days</label>
                <input
                  type="number"
                  min="0"
                  value={customDays}
                  onChange={e => setCustomDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full border border-neutral-200 dark:border-neutral-600 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-neutral-500 mb-1 block">Hours</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={customHours}
                  onChange={e => setCustomHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full border border-neutral-200 dark:border-neutral-600 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            {customDays * 24 + customHours < 8 && (
              <p className="text-xs text-rose-500 mt-2">Duration will automatically default to the 8 hour minimum.</p>
            )}
          </div>

          {/* Contextual Sharing Toggles */}
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">Shared Fields</label>
            <div className="space-y-2">
              {/* Household Information at top */}
              {generalInfoText && (
                <label className="flex items-center justify-between p-3 min-h-[44px] rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 cursor-pointer">
                  <span className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <Info className="w-3.5 h-3.5 text-emerald-600" /> Household Information
                  </span>
                  <input type="checkbox" checked={includeGeneralInfo} onChange={e => setIncludeGeneralInfo(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                </label>
              )}
              {/* All other fields — drag to reorder */}
              <Reorder.Group axis="y" values={sortableOrder} onReorder={setSortableOrder} className="space-y-2">
                {sortableOrder.map(key => {
                  const field = SHARING_FIELDS.find(f => f.key === key);
                  if (!field) return null;
                  return (
                    <Reorder.Item key={key} value={key} className="list-none">
                      <label className="flex items-center justify-between p-3 min-h-[44px] rounded-xl border border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer bg-white dark:bg-neutral-800">
                        <span className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                          <GripVertical className="w-4 h-4 text-neutral-300 dark:text-neutral-600 cursor-grab active:cursor-grabbing shrink-0" />
                          {field.icon} {field.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={sharing[key as keyof SharingToggles]}
                          onChange={e => setSharing(s => ({ ...s, [key]: e.target.checked }))}
                          className="w-4 h-4 accent-emerald-500"
                        />
                      </label>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-neutral-100 dark:border-neutral-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
            Cancel
          </button>
          {(template === 'custom' || template === 'emergency') && !customTemplateSaved ? (
            <button onClick={handleSaveCustomTemplate} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors">
              Save Card Template
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!selectedPetId}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {editCard ? 'Save Changes' : 'Create Card'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
