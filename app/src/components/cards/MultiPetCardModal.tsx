// app/src/components/cards/MultiPetCardModal.tsx
// Default export for React.lazy — Multi-pet card creation/edit modal.

import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { Pet } from '../../types/pet';
import {
  TEMPLATE_DEFAULTS,
  TEMPLATE_LABELS,
  CUSTOM_TEMPLATE_KEY,
  type SharingToggles,
  type CardTemplate,
  type PetCard,
  type MultiPetConfig,
} from '../../types/cardExtensions';
import { markCardCreated } from '../../lib/onboardingService';

// ─── Local SHARING_FIELDS (icons can't live in cardExtensions.ts) ──────────────

const SHARING_FIELDS: { key: keyof SharingToggles; label: string; icon: ReactNode }[] = [
  { key: 'basicInfo', label: 'Pet Description', icon: <span className="material-symbols-outlined text-[14px]">info</span> },
  { key: 'diet', label: 'Health & Diet', icon: <span className="material-symbols-outlined text-[14px]">restaurant</span> },
  { key: 'emergencyContact', label: 'Emergency Contact', icon: <span className="material-symbols-outlined text-[14px]">phone</span> },
  { key: 'medicalOverview', label: 'Medical Notes', icon: <span className="material-symbols-outlined text-[14px]">monitor_heart</span> },
  { key: 'medications', label: 'Medications', icon: <span className="material-symbols-outlined text-[14px]">syringe</span> },
  { key: 'microchip', label: 'Microchip ID', icon: <span className="material-symbols-outlined text-[14px]">shield</span> },
  { key: 'personalityPlay', label: 'Personality & Play', icon: <span className="material-symbols-outlined text-[14px]">favorite</span> },
  { key: 'vaccineRecords', label: 'Vaccine Records', icon: <span className="material-symbols-outlined text-[14px]">syringe</span> },
  { key: 'vetInfo', label: 'Vet Info', icon: <span className="material-symbols-outlined text-[14px]">monitor_heart</span> },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MultiPetCardModalProps {
  pets: Pet[];
  onClose: () => void;
  onCreate: (card: PetCard) => void;
  editCard?: PetCard;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MultiPetCardModal({ pets, onClose, onCreate, editCard }: MultiPetCardModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const publicPets = pets.filter(p => !p.isPrivate);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (editCard?.multiPetConfig) return new Set(editCard.multiPetConfig.map(c => c.petId));
    return new Set(publicPets.slice(0, 2).map(p => p.id));
  });
  const [perPetSharing, setPerPetSharing] = useState<Record<string, SharingToggles>>(() => {
    const init: Record<string, SharingToggles> = {};
    if (editCard?.multiPetConfig) {
      editCard.multiPetConfig.forEach(c => { init[c.petId] = { ...c.sharing } as SharingToggles; });
    } else {
      publicPets.forEach(p => { init[p.id] = { ...TEMPLATE_DEFAULTS.sitter }; });
    }
    return init;
  });
  const [expandedPetId, setExpandedPetId] = useState<string | null>(null);
  const [template, setTemplate] = useState<CardTemplate>(editCard?.template || 'sitter');
  const [customDays, setCustomDays] = useState(() => {
    if (editCard) return Math.max(0, Math.floor((editCard.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
    return 2;
  });
  const [customHours, setCustomHours] = useState(() => {
    if (editCard) return Math.max(0, Math.floor(((editCard.expiresAt - Date.now()) / (1000 * 60 * 60)) % 24));
    return 0;
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

  const togglePet = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateSharing = (petId: string, key: keyof SharingToggles, val: boolean) => {
    setPerPetSharing(prev => ({ ...prev, [petId]: { ...prev[petId], [key]: val } }));
  };

  const handleCreate = () => {
    const totalHours = Math.max(8, customDays * 24 + customHours);
    const expiresAt = Date.now() + totalHours * 60 * 60 * 1000;
    const multiPetConfig: MultiPetConfig = [...selectedIds].map(petId => ({
      petId,
      sharing: perPetSharing[petId] ?? { ...TEMPLATE_DEFAULTS.sitter },
    }));
    const newCard: PetCard = {
      id: editCard?.id || crypto.randomUUID(),
      petId: 'multi-pet',
      template,
      createdAt: editCard?.createdAt || Date.now(),
      expiresAt,
      status: editCard?.status || 'active',
      sharing: { ...TEMPLATE_DEFAULTS[template] },
      multiPetConfig,
    };
    onCreate(newCard);
    markCardCreated();
    onClose();
  };

  const canCreate = selectedIds.size >= 2;

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center items-end justify-center sm:p-4 p-0 bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="multi-pet-card-modal-title"
        className="bg-surface sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl border border-outline-variant w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-gradient-to-r from-tertiary to-secondary p-5 shrink-0">
          <h2 id="multi-pet-card-modal-title" className="text-xl font-bold text-on-tertiary flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-on-tertiary/70">layers</span> {editCard ? 'Edit Multi-pet Card' : 'Multi-pet Card'}
          </h2>
          <p className="text-on-tertiary/70 text-sm mt-1">{editCard ? 'Update sharing options and validity.' : 'Select 2+ pets and configure what data each card shows.'}</p>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Pet selection */}
          <div>
            <label className="text-sm font-semibold text-on-surface-variant mb-2 block">
              Select Pets <span className="font-normal text-on-surface-variant/60">(minimum 2)</span>
            </label>
            {publicPets.length < 2 ? (
              <p className="text-sm text-on-surface-variant">You need at least 2 public pets to create a Multi-pet Card.</p>
            ) : (
              <div className="space-y-2">
                {publicPets.map(pet => {
                  const isSelected = selectedIds.has(pet.id);
                  const isExpanded = expandedPetId === pet.id;
                  return (
                    <div key={pet.id} className={`rounded-xl border-2 transition-all ${isSelected ? 'border-tertiary' : 'border-outline-variant'}`}>
                      <div className="flex items-center gap-3 p-3">
                        <input type="checkbox" checked={isSelected} disabled={!!editCard} onChange={() => togglePet(pet.id)} className="w-4 h-4 accent-tertiary disabled:opacity-50" />
                        {pet.image ? (
                          <img src={pet.image} alt={pet.name} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-on-primary/80" style={{ backgroundColor: pet.backgroundColor || '#a8a29e' }}>{pet.name?.[0]?.toUpperCase()}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{pet.name}</p>
                          <p className="text-xs text-on-surface-variant truncate">{pet.breed || pet.type || '—'}</p>
                        </div>
                        {isSelected && (
                          <button type="button" onClick={() => setExpandedPetId(isExpanded ? null : pet.id)} className="text-xs text-tertiary flex items-center gap-0.5 font-medium">
                            Data {isExpanded ? <span className="material-symbols-outlined text-[14px]">expand_less</span> : <span className="material-symbols-outlined text-[14px]">expand_more</span>}
                          </button>
                        )}
                      </div>
                      {isSelected && isExpanded && (
                        <div className="border-t border-outline-variant px-4 py-3 space-y-2 bg-surface-container-low/50 rounded-b-xl">
                          <p className="text-xs font-medium text-on-surface-variant mb-1">Included data for {pet.name}:</p>
                          {SHARING_FIELDS.map(({ key, label, icon }) => (
                            <label key={key} className="flex items-center justify-between py-1 min-h-[44px]">
                              <span className="flex items-center gap-2 text-xs text-on-surface-variant">{icon} {label}</span>
                              <input type="checkbox" checked={perPetSharing[pet.id]?.[key] ?? true} onChange={e => updateSharing(pet.id, key, e.target.checked)} className="w-3.5 h-3.5 accent-tertiary" />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Template */}
          <div>
            <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Card Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['vet', 'sitter', 'custom'] as CardTemplate[]).map(t => (
                <button key={t} onClick={() => setTemplate(t)} className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${template === t ? 'border-tertiary bg-tertiary-container text-on-tertiary-container' : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}>
                  {TEMPLATE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="text-sm font-semibold text-on-surface-variant mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">schedule</span> Expiration <span className="font-normal text-on-surface-variant/60">(min 8 hours)</span>
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-on-surface-variant mb-1 block">Days</label>
                <input type="number" min="0" value={customDays} onChange={e => setCustomDays(Math.max(0, parseInt(e.target.value) || 0))} className="w-full border border-outline-variant rounded-xl px-3 py-2 text-on-surface bg-surface-container focus:ring-2 focus:ring-tertiary outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-on-surface-variant mb-1 block">Hours</label>
                <input type="number" min="0" max="23" value={customHours} onChange={e => setCustomHours(Math.max(0, parseInt(e.target.value) || 0))} className="w-full border border-outline-variant rounded-xl px-3 py-2 text-on-surface bg-surface-container focus:ring-2 focus:ring-tertiary outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-outline-variant flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={!canCreate} className="flex-1 py-2.5 rounded-xl bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {editCard ? 'Save Changes' : (canCreate ? `Create Card (${selectedIds.size} pets)` : 'Select 2+ pets')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
