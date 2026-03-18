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
        <div className="text-center py-6 text-neutral-500 dark:text-neutral-400">
          <p className="text-sm mb-3">No medical records yet.</p>
          {onMedical && (
            <button
              onClick={onMedical}
              className="text-sm text-neutral-900 dark:text-neutral-100 font-semibold underline underline-offset-2"
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
                <div className="bg-rose-50 dark:bg-rose-950/30 rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{overdue}</p>
                  <p className="text-xs text-rose-500 dark:text-rose-400">Overdue</p>
                </div>
              )}
              {dueSoon > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{dueSoon}</p>
                  <p className="text-xs text-amber-500 dark:text-amber-400">Due Soon</p>
                </div>
              )}
              {upToDate > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{upToDate}</p>
                  <p className="text-xs text-emerald-500 dark:text-emerald-400">Up to Date</p>
                </div>
              )}
            </div>
          )}

          {/* Active medications */}
          {activeMeds > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Active Medications</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">{activeMeds}</span>
            </div>
          )}

          {/* Last vet */}
          {pet.lastVet && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Last Vet Visit</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">{pet.lastVet}</span>
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
          className="w-full mt-4 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium py-2 rounded-xl text-sm hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
        >
          Open Medical Records
        </button>
      )}
    </div>
  );
}
