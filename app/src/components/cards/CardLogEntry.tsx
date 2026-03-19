import type { Pet } from '../../types/pet';
import type { PetCard } from '../../types/cardExtensions';
import { TEMPLATE_LABELS } from '../../types/cardExtensions';

export function CardLogEntry({ card, pet }: { card: PetCard; pet: Pet }) {
  return (
    <div className="bg-surface-container/80 backdrop-blur-sm rounded-2xl p-6 border border-outline-variant space-y-4">
      <div className="flex items-center gap-3 text-on-surface-variant mb-2">
        <span className="material-symbols-outlined text-[20px] text-error">shield_off</span>
        <h3 className="font-semibold text-on-surface-variant">Access Log Entry</h3>
      </div>
      <div className="space-y-4 text-sm mt-4">
        <div className="flex justify-between border-b border-outline-variant pb-3">
          <span className="text-on-surface-variant">Pet</span>
          <span className="font-medium text-on-surface">{pet.name}</span>
        </div>
        <div className="flex justify-between border-b border-outline-variant pb-3">
          <span className="text-on-surface-variant">Type</span>
          <span className="font-medium text-on-surface">{TEMPLATE_LABELS[card.template]}</span>
        </div>
        <div className="flex justify-between border-b border-outline-variant pb-3">
          <span className="text-on-surface-variant">Issued</span>
          <span className="font-medium text-on-surface">{new Date(card.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between pb-3">
          <span className="text-on-surface-variant">Revoked</span>
          <span className="font-medium text-error">{new Date(card.revokedAt || Date.now()).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
