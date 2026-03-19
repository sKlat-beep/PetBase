import type { Pet } from '../../types/pet';
import { getVaccineStatus, type Vaccine } from '../MedicalRecordsModal';
import { WeightTrendChart } from './WeightTrendChart';
import { HealthInsights } from './HealthInsights';

interface PetHealthPanelProps {
  pet: Pet;
  onMedical?: () => void;
}

export function PetHealthPanel({ pet, onMedical }: PetHealthPanelProps) {
  const petVaccines = (pet as any).vaccines as Vaccine[] | undefined;
  const petMeds = (pet as any).medications as Array<{ endDate: string }> | undefined;
  const today = new Date().toISOString().split('T')[0];
  const activeMeds = (petMeds ?? []).filter(m => !m.endDate || m.endDate >= today).length;
  const hasVaccines = petVaccines && petVaccines.length > 0;

  const isEmpty = !hasVaccines && activeMeds === 0 && !pet.lastVet;

  const overdue = (petVaccines ?? []).filter(v => getVaccineStatus(v.nextDueDate) === 'overdue').length;
  const dueSoon = (petVaccines ?? []).filter(v => getVaccineStatus(v.nextDueDate) === 'due-soon').length;
  const upToDate = (petVaccines ?? []).filter(v => getVaccineStatus(v.nextDueDate) === 'up-to-date').length;

  return (
    <div className="space-y-4">
      {isEmpty ? (
        <div className="text-center py-6 text-on-surface-variant">
          <p className="text-sm mb-3">No medical records yet.</p>
          {onMedical && (
            <button
              onClick={onMedical}
              className="text-sm text-on-surface font-semibold underline underline-offset-2"
            >
              Add medical records →
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vaccine status counts */}
          {hasVaccines && (
            <div className="grid grid-cols-3 gap-2">
              {overdue > 0 && (
                <div className="bg-error-container rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-bold text-on-error-container">{overdue}</p>
                  <p className="text-xs text-on-error-container">Overdue</p>
                </div>
              )}
              {dueSoon > 0 && (
                <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-bold text-amber-600">{dueSoon}</p>
                  <p className="text-xs text-amber-500">Due Soon</p>
                </div>
              )}
              {upToDate > 0 && (
                <div className="bg-primary-container rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-bold text-on-primary-container">{upToDate}</p>
                  <p className="text-xs text-on-primary-container">Up to Date</p>
                </div>
              )}
            </div>
          )}

          {/* Active medications */}
          {activeMeds > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Active Medications</span>
              <span className="font-semibold text-on-surface">{activeMeds}</span>
            </div>
          )}

          {/* Last vet */}
          {pet.lastVet && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">Last Vet Visit</span>
              <span className="font-semibold text-on-surface">{pet.lastVet}</span>
            </div>
          )}

          {/* Weight trend chart */}
          <WeightTrendChart pet={pet} />

          {/* AI-powered health insights */}
          <HealthInsights pet={pet} />
        </>
      )}

      {onMedical && (
        <button
          onClick={onMedical}
          className="w-full mt-4 bg-surface-container text-on-surface-variant font-medium py-2 rounded-xl text-sm hover:bg-surface-container-high transition-colors"
        >
          Open Medical Records
        </button>
      )}
    </div>
  );
}
