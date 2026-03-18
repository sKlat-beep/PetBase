import React from 'react';
import { Link } from 'react-router';
import { Settings2, Syringe, Heart, Plus } from 'lucide-react';
import { formatPetAge } from '../../../lib/petAge';
import { getVaccineStatus } from '../../MedicalRecordsModal';
import type { Pet } from '../../../contexts/PetContext';

const GLASS_CARD = 'h-full bg-white/75 dark:bg-neutral-800/75 backdrop-blur-xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden';

interface Props {
  pets: Pet[];
  onAddPet: () => void;
}

function PetHealthPetsWidgetInner({ pets, onAddPet }: Props) {
  const displayPets = pets.slice(0, 6);
  return (
    <section className={`${GLASS_CARD} p-5`} aria-label="Pets & Health">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span aria-hidden="true">🐾</span> Pets &amp; Health
        </h2>
        <Link to="/pets" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">
          View All →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayPets.map(pet => {
          const vaccines = (pet as any).vaccines as { name: string; nextDueDate: string }[] | undefined;
          const overdue = vaccines?.filter(v => getVaccineStatus(v.nextDueDate) === 'overdue').length ?? 0;
          const dueSoon = vaccines?.filter(v => getVaccineStatus(v.nextDueDate) === 'due-soon').length ?? 0;
          const allGood = overdue === 0 && dueSoon === 0;
          return (
            <div key={pet.id} className="bg-white/60 dark:bg-neutral-700/60 rounded-xl p-3 border border-neutral-200/50 dark:border-neutral-600/50 flex flex-col gap-2">
              <Link to="/pets" state={{ editPetId: pet.id }} className="flex flex-col items-center gap-2 group">
                <img src={pet.image} alt={pet.name} width={112} height={112} className="w-28 h-28 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                <div className="text-center min-w-0 w-full">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{pet.name}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{pet.breed}</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {pet.age && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-medium text-neutral-600 dark:text-neutral-300">{formatPetAge(pet.birthday, pet.age)}</span>}
                    {pet.weight && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-medium text-neutral-600 dark:text-neutral-300">{pet.weight}</span>}
                  </div>
                </div>
              </Link>
              <div className="flex justify-center">
                {overdue > 0 && <span className="text-xs bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full font-medium">{overdue} overdue</span>}
                {overdue === 0 && dueSoon > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">⚠ {dueSoon} due soon</span>}
                {allGood && <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">✓ Up to date</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <Link to="/pets" state={{ editPetId: pet.id }} aria-label={`Edit ${pet.name}`} title="Edit" className="flex items-center justify-center p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 motion-safe:transition-colors min-h-[36px]">
                  <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
                <Link to="/pets" state={{ openMedical: true, tab: 'meds', petId: pet.id }} aria-label={`Medications for ${pet.name}`} title="Meds" className="flex items-center justify-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 motion-safe:transition-colors min-h-[36px]">
                  <Syringe className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
                <Link to="/cards" state={{ openCreateModal: true, petId: pet.id }} aria-label={`Pet card for ${pet.name}`} title="Card" className="flex items-center justify-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 motion-safe:transition-colors min-h-[36px]">
                  <Heart className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}
        <button
          onClick={onAddPet}
          className="bg-neutral-50/80 dark:bg-neutral-700/50 border-2 border-dashed border-neutral-200 dark:border-neutral-600 rounded-xl p-3 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-emerald-600 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 motion-safe:transition-colors min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <Plus className="w-5 h-5 mb-1" aria-hidden="true" />
          <span className="text-xs font-medium">Add Pet</span>
        </button>
      </div>
      {pets.length > 6 && (
        <Link to="/pets" className="block text-xs text-center text-emerald-600 dark:text-emerald-400 font-medium hover:underline mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded">
          View all {pets.length} pets →
        </Link>
      )}
    </section>
  );
}

export const PetHealthPetsWidget = React.memo(PetHealthPetsWidgetInner);
