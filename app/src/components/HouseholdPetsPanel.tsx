import { useState, useEffect } from 'react';
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
        <span className="material-symbols-outlined text-[20px] text-tertiary shrink-0">home</span>
        <h2 className="text-xl font-bold text-on-surface">
          {household.name} — Family Pets
        </h2>
      </header>
      <p className="text-sm text-on-surface-variant -mt-2">
        Pets shared by your household members. View only.
      </p>

      <div className="space-y-6">
        {memberPets.map(mp => (
          <div key={mp.uid} className="bg-surface-container-low rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
            {/* Member header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant">
              <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px] text-tertiary">person</span>
              </div>
              <span className="font-semibold text-on-surface">{mp.displayName}</span>
            </div>

            {/* Pets */}
            {mp.loading ? (
              <div className="p-5 space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-surface-container animate-pulse" />
                ))}
              </div>
            ) : mp.pets.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <span className="material-symbols-outlined text-[28px] mx-auto mb-2 text-outline-variant block">pets</span>
                <p className="text-sm text-on-surface-variant">No public pets.</p>
              </div>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {mp.pets.map(pet => (
                  <li key={pet.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant">pets</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-on-surface truncate">{pet.name}</p>
                      {(pet.type || pet.breed) && (
                        <p className="text-sm text-on-surface-variant truncate">
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
