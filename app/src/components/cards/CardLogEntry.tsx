import type { Pet } from '../../types/pet';
import type { PetCard } from '../../types/cardExtensions';
import { TEMPLATE_LABELS } from '../../types/cardExtensions';
import { ShieldOff } from 'lucide-react';

export function CardLogEntry({ card, pet }: { card: PetCard; pet: Pet }) {
  return (
    <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 space-y-4">
      <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-2">
        <ShieldOff className="w-5 h-5 text-rose-500" />
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300">Access Log Entry</h3>
      </div>
      <div className="space-y-4 text-sm mt-4">
        <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3">
          <span className="text-neutral-500">Pet</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{pet.name}</span>
        </div>
        <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3">
          <span className="text-neutral-500">Type</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{TEMPLATE_LABELS[card.template]}</span>
        </div>
        <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3">
          <span className="text-neutral-500">Issued</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{new Date(card.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between pb-3">
          <span className="text-neutral-500">Revoked</span>
          <span className="font-medium text-rose-600 dark:text-rose-400">{new Date(card.revokedAt || Date.now()).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
