import React from 'react';
import { Link } from 'react-router';
import { formatPetAge } from '../../../lib/petAge';
import { getVaccineStatus } from '../../MedicalRecordsModal';
import type { Pet } from '../../../contexts/PetContext';

interface Props {
  pets: Pet[];
  onAddPet: () => void;
}

function PetHealthPetsWidgetInner({ pets, onAddPet }: Props) {
  const displayPets = pets.slice(0, 6);
  return (
    <section className="h-full glass-card overflow-hidden p-5" aria-label="Pets & Health">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
          <span className="material-symbols-outlined text-primary-container">pets</span> Pets &amp; Health
        </h2>
        <Link to="/pets" className="text-xs text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
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
            <div key={pet.id} className="bg-surface-container/60 rounded-xl p-3 border border-outline-variant/50 flex flex-col gap-2">
              <Link to="/pets" state={{ editPetId: pet.id }} className="flex flex-col items-center gap-2 group">
                <img src={pet.image} alt={pet.name} width={112} height={112} className="w-28 h-28 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                <div className="text-center min-w-0 w-full">
                  <p className="text-sm font-semibold text-on-surface truncate">{pet.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">{pet.breed}</p>
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {pet.age && <span className="text-xs bg-surface-container-high px-1.5 py-0.5 rounded font-medium text-on-surface-variant">{formatPetAge(pet.birthday, pet.age)}</span>}
                    {pet.weight && <span className="text-xs bg-surface-container-high px-1.5 py-0.5 rounded font-medium text-on-surface-variant">{pet.weight}</span>}
                  </div>
                </div>
              </Link>
              <div className="flex justify-center">
                {overdue > 0 && <span className="text-xs bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-medium">{overdue} overdue</span>}
                {overdue === 0 && dueSoon > 0 && <span className="text-xs bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded-full font-medium">⚠ {dueSoon} due soon</span>}
                {allGood && <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-medium">✓ Up to date</span>}
              </div>
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-outline-variant">
                <Link to="/pets" state={{ editPetId: pet.id }} aria-label={`Edit ${pet.name}`} title="Edit" className="flex items-center justify-center p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant motion-safe:transition-colors min-h-[36px]">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">settings</span>
                </Link>
                <Link to="/pets" state={{ openMedical: true, tab: 'meds', petId: pet.id }} aria-label={`Medications for ${pet.name}`} title="Meds" className="flex items-center justify-center p-2 rounded-lg bg-secondary-container/30 hover:bg-secondary-container/50 text-secondary motion-safe:transition-colors min-h-[36px]">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">vaccines</span>
                </Link>
                <Link to="/pets?openCards=true" aria-label={`Pet card for ${pet.name}`} title="Card" className="flex items-center justify-center p-2 rounded-lg bg-tertiary-container/30 hover:bg-tertiary-container/50 text-tertiary motion-safe:transition-colors min-h-[36px]">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">favorite</span>
                </Link>
              </div>
            </div>
          );
        })}
        <button
          onClick={onAddPet}
          className="bg-surface-container/50 border-2 border-dashed border-outline-variant rounded-xl p-3 flex flex-col items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 hover:bg-primary-container/10 motion-safe:transition-colors min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="material-symbols-outlined text-xl mb-1" aria-hidden="true">add</span>
          <span className="text-xs font-medium">Add Pet</span>
        </button>
      </div>
      {pets.length > 6 && (
        <Link to="/pets" className="block text-xs text-center text-primary font-medium hover:underline mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          View all {pets.length} pets →
        </Link>
      )}
    </section>
  );
}

export const PetHealthPetsWidget = React.memo(PetHealthPetsWidgetInner);
