// app/src/components/cards/CreateCardModal.tsx
// Default export for React.lazy — single-pet card creation/edit modal.

import React, { useState, useRef, useMemo, useEffect, type ReactNode } from 'react';
import { motion, Reorder } from 'motion/react';
import type { Pet } from '../../types/pet';
import {
  TEMPLATE_DEFAULTS,
  TEMPLATE_LABELS,
  CUSTOM_TEMPLATE_KEY,
  type SharingToggles,
  type CardTemplate,
  type PetCard,
} from '../../types/cardExtensions';
import { markCardCreated } from '../../lib/onboardingService';

// ─── Material Symbol helper ──────────────────────────────────────────────────

function MIcon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>;
}

// ─── Local SHARING_FIELDS (icons via Material Symbols) ───────────────────────

const SHARING_FIELDS: { key: keyof SharingToggles; label: string; icon: ReactNode }[] = [
  { key: 'basicInfo', label: 'Pet Description', icon: <MIcon name="info" className="text-[16px]" /> },
  { key: 'diet', label: 'Health & Diet', icon: <MIcon name="restaurant" className="text-[16px]" /> },
  { key: 'emergencyContact', label: 'Emergency Contact', icon: <MIcon name="call" className="text-[16px]" /> },
  { key: 'medicalOverview', label: 'Medical Notes', icon: <MIcon name="monitor_heart" className="text-[16px]" /> },
  { key: 'medications', label: 'Medications', icon: <MIcon name="vaccines" className="text-[16px]" /> },
  { key: 'microchip', label: 'Microchip ID', icon: <MIcon name="verified_user" className="text-[16px]" /> },
  { key: 'personalityPlay', label: 'Personality & Play', icon: <MIcon name="favorite" className="text-[16px]" /> },
  { key: 'vaccineRecords', label: 'Vaccine Records', icon: <MIcon name="vaccines" className="text-[16px]" /> },
  { key: 'vetInfo', label: 'Vet Info', icon: <MIcon name="monitor_heart" className="text-[16px]" /> },
];

// ─── Template icon map ───────────────────────────────────────────────────────

const TEMPLATE_ICONS: Record<CardTemplate, string> = {
  vet: 'local_hospital',
  sitter: 'person',
  custom: 'tune',
  emergency: 'emergency',
};

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

  // Selected pet for preview summary
  const selectedPet = useMemo(() => pets.find(p => p.id === selectedPetId), [pets, selectedPetId]);

  // Count enabled fields
  const enabledCount = Object.values(sharing).filter(Boolean).length + (includeGeneralInfo ? 1 : 0);

  // Progress: step 1=pet, step 2=template, step 3=fields
  const step = selectedPetId ? (template ? 3 : 2) : 1;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Ambient glow decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-tertiary/10 blur-3xl" />
      </div>

      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-card-modal-title"
        className="glass-card relative z-10 w-full max-w-6xl min-h-[700px] flex flex-col sm:flex-row overflow-hidden shadow-2xl"
      >
        {/* ─── LEFT: Form Steps ───────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-outline-variant/30">
            <div className="flex items-center justify-between">
              <h2 id="create-card-modal-title" className="text-xl font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
                <MIcon name="qr_code_2" className="text-[24px] text-primary" />
                {editCard ? 'Edit Pet Card' : 'Create Pet Card'}
              </h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high motion-safe:transition-colors"
                aria-label="Close"
              >
                <MIcon name="close" className="text-[20px]" />
              </button>
            </div>
            <p className="text-on-surface-variant text-sm mt-1">
              {editCard ? 'Update sharing options and validity.' : 'Choose your pet, template, and sharing options.'}
            </p>

            {/* Progress bar */}
            <div className="flex gap-1.5 mt-4">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 rounded-full flex-1 motion-safe:transition-all duration-300 ${s <= step ? 'bg-primary' : 'bg-outline-variant/40'}`}
                />
              ))}
            </div>
          </div>

          {/* Scrollable form body */}
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            {/* Pet select */}
            <div>
              <label className="text-sm font-medium text-on-surface mb-1.5 block">Pet</label>
              <select
                value={selectedPetId}
                disabled={!!editCard}
                onChange={e => setSelectedPetId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-on-surface bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none disabled:opacity-50 motion-safe:transition-colors"
              >
                {pets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Template */}
            <div>
              <label className="text-sm font-medium text-on-surface mb-1.5 block">Card Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['vet', 'sitter', 'custom'] as CardTemplate[]).map(t => (
                  <button
                    key={t}
                    onClick={() => handleTemplateChange(t)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 motion-safe:transition-all flex items-center justify-center gap-1.5 ${template === t
                      ? 'border-primary bg-primary-container/20 text-on-primary-container'
                      : 'border-outline-variant text-on-surface-variant hover:border-outline hover:bg-surface-container-high'}`}
                  >
                    <MIcon name={TEMPLATE_ICONS[t]} className="text-[18px]" />
                    {TEMPLATE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="text-sm font-medium text-on-surface mb-1.5 flex items-center gap-1.5">
                <MIcon name="schedule" className="text-[18px]" /> Expiration (Min 8 hours)
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-on-surface-variant mb-1 block">Days</label>
                  <input
                    type="number"
                    min="0"
                    value={customDays}
                    onChange={e => setCustomDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl px-3 py-2 text-on-surface bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-on-surface-variant mb-1 block">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={customHours}
                    onChange={e => setCustomHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl px-3 py-2 text-on-surface bg-surface-container border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                  />
                </div>
              </div>
              {customDays * 24 + customHours < 8 && (
                <p className="text-xs text-error mt-2 flex items-center gap-1">
                  <MIcon name="warning" className="text-[14px]" />
                  Duration will automatically default to the 8 hour minimum.
                </p>
              )}
            </div>

            {/* Contextual Sharing Toggles — 2-col toggle grid */}
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">Shared Fields</label>
              <div className="space-y-2">
                {/* Household Information at top */}
                {generalInfoText && (
                  <label className="flex items-center justify-between p-3 min-h-[44px] rounded-xl border border-primary-container/30 bg-primary-container/10 hover:bg-primary-container/15 cursor-pointer motion-safe:transition-colors">
                    <span className="flex items-center gap-2 text-sm text-on-surface">
                      <MIcon name="info" className="text-[16px] text-primary" /> Household Information
                    </span>
                    <input type="checkbox" checked={includeGeneralInfo} onChange={e => setIncludeGeneralInfo(e.target.checked)} className="w-4 h-4 accent-primary" />
                  </label>
                )}
                {/* All other fields — drag to reorder, 2-col grid on wider */}
                <Reorder.Group axis="y" values={sortableOrder} onReorder={setSortableOrder} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sortableOrder.map(key => {
                    const field = SHARING_FIELDS.find(f => f.key === key);
                    if (!field) return null;
                    const isOn = sharing[key as keyof SharingToggles];
                    return (
                      <Reorder.Item key={key} value={key} className="list-none">
                        <label className={`flex items-center justify-between p-3 min-h-[44px] rounded-xl border cursor-pointer motion-safe:transition-all ${
                          isOn
                            ? 'border-primary/30 bg-primary-container/10'
                            : 'border-outline-variant/40 bg-surface-container hover:bg-surface-container-high'
                        }`}>
                          <span className="flex items-center gap-2 text-sm text-on-surface">
                            <MIcon name="drag_indicator" className="text-[16px] text-on-surface-variant/50 cursor-grab active:cursor-grabbing shrink-0" />
                            {field.icon} {field.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={isOn}
                            onChange={e => setSharing(s => ({ ...s, [key]: e.target.checked }))}
                            className="w-4 h-4 accent-primary"
                          />
                        </label>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-5 border-t border-outline-variant/30 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container-high motion-safe:transition-colors min-h-[44px]">
              Cancel
            </button>
            {(template === 'custom' || template === 'emergency') && !customTemplateSaved ? (
              <button onClick={handleSaveCustomTemplate} className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-semibold hover:brightness-110 motion-safe:transition-all min-h-[44px] flex items-center justify-center gap-2">
                <MIcon name="save" className="text-[18px]" /> Save Card Template
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!selectedPetId}
                className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-semibold hover:brightness-110 motion-safe:transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
              >
                <MIcon name={editCard ? 'save' : 'add_card'} className="text-[18px]" />
                {editCard ? 'Save Changes' : 'Create Card'}
              </button>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Live Preview ────────────────────────────────────────── */}
        <div className="hidden sm:flex w-[420px] shrink-0 flex-col border-l border-outline-variant/30 bg-surface-container-low/50">
          <div className="p-6 flex-1 flex flex-col items-center justify-center">
            {/* Template indicator */}
            <div className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium">
              <MIcon name={TEMPLATE_ICONS[template]} className="text-[16px] text-primary" />
              {TEMPLATE_LABELS[template]} Template
            </div>

            {/* Card preview */}
            <motion.div
              layout
              className="glass-morphism w-full max-w-[340px] rounded-2xl p-5 border border-outline-variant/30"
            >
              {/* Pet info */}
              <div className="flex items-center gap-3 mb-4">
                {selectedPet?.image ? (
                  <img src={selectedPet.image} alt={selectedPet.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/30" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
                    <MIcon name="pets" className="text-[28px] text-on-surface-variant/50" />
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
                    {selectedPet?.name || 'Select a pet'}
                  </p>
                  {selectedPet?.breed && (
                    <p className="text-xs text-on-surface-variant">{selectedPet.breed}</p>
                  )}
                </div>
              </div>

              {/* QR placeholder */}
              <div className="w-full aspect-square max-w-[140px] mx-auto mb-4 rounded-xl bg-surface-container flex items-center justify-center border border-outline-variant/20">
                <MIcon name="qr_code_2" className="text-[56px] text-on-surface-variant/30" />
              </div>

              {/* Field checklist preview */}
              <div className="space-y-1.5">
                {includeGeneralInfo && (
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <MIcon name="check_circle" className="text-[14px] text-primary" />
                    Household Information
                  </div>
                )}
                {sortableOrder.map(key => {
                  const field = SHARING_FIELDS.find(f => f.key === key);
                  if (!field || !sharing[key as keyof SharingToggles]) return null;
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <MIcon name="check_circle" className="text-[14px] text-primary" />
                      {field.label}
                    </div>
                  );
                })}
              </div>

              {/* Expiry line */}
              <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center gap-2 text-xs text-on-surface-variant">
                <MIcon name="schedule" className="text-[14px]" />
                Expires in {customDays}d {customHours}h
              </div>
            </motion.div>

            {/* Summary stats */}
            <div className="mt-4 flex items-center gap-4 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <MIcon name="checklist" className="text-[16px] text-secondary" />
                {enabledCount} fields shared
              </span>
              <span className="flex items-center gap-1">
                <MIcon name="timer" className="text-[16px] text-tertiary" />
                {Math.max(8, customDays * 24 + customHours)}h total
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
