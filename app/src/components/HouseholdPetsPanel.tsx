import { useState, useEffect } from 'react';
import { Home, PawPrint, User } from 'lucide-react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { getPublicPetsForUser, type PublicPetSummary } from '../lib/firestoreService';

interface MemberPets {
  uid: string;
  displayName: string;
  pets: PublicPetSummary[];
  loading: boolean;
}

export function HouseholdPetsPanel() {
  const { household, members } = useHousehold();
  const { user } = useAuth();
  const [memberPets, setMemberPets] = useState<MemberPets[]>([]);

  useEffect(() => {
    if (!household || !user) { setMemberPets([]); return; }

    const others = members.filter(m => m.uid !== user.uid);
    if (others.length === 0) { setMemberPets([]); return; }

    // Init with loading state
    setMemberPets(others.map(m => ({ uid: m.uid, displayName: m.displayName, pets: [], loading: true })));

    // Load pets for each member concurrently
    others.forEach(m => {
      getPublicPetsForUser(m.uid)
        .then(pets => {
          setMemberPets(prev => prev.map(mp =>
            mp.uid === m.uid ? { ...mp, pets, loading: false } : mp
          ));
        })
        .catch(() => {
          setMemberPets(prev => prev.map(mp =>
            mp.uid === m.uid ? { ...mp, loading: false } : mp
          ));
        });
    });
  }, [household, members, user]);

  if (!household || memberPets.length === 0) return null;

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Home className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {household.name} — Family Pets
        </h2>
      </header>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 -mt-2">
        Pets shared by your household members. View only.
      </p>

      <div className="space-y-6">
        {memberPets.map(mp => (
          <div key={mp.uid} className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
            {/* Member header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-neutral-700">
              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{mp.displayName}</span>
            </div>

            {/* Pets */}
            {mp.loading ? (
              <div className="p-5 space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-700 animate-pulse" />
                ))}
              </div>
            ) : mp.pets.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <PawPrint className="w-7 h-7 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No public pets.</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {mp.pets.map(pet => (
                  <li key={pet.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                      <PawPrint className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{pet.name}</p>
                      {(pet.type || pet.breed) && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                          {[pet.type, pet.breed].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
