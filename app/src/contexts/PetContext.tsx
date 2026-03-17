import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { loadPets, savePet, deletePetDoc, deletePublicCardsForPet, createPetAlbum } from '../lib/firestoreService';
import type { Pet } from '../types/pet';
import { logActivity } from '../utils/activityLog';
import { get, set } from 'idb-keyval';

export type { Pet } from '../types/pet';

interface PetContextValue {
  pets: Pet[];
  loading: boolean;
  addPet: (data: Omit<Pet, 'id'>) => void;
  updatePet: (pet: Pet) => void;
  deletePet: (id: string) => void;
}

const PetContext = createContext<PetContextValue>({
  pets: [],
  loading: true,
  addPet: () => { },
  updatePet: () => { },
  deletePet: () => { },
});

export function PetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadPets(user.uid)
      .then((firestorePets) => setPets(firestorePets))
      .catch(() => setPets([]))
      .finally(() => setLoading(false));
  }, [user]);

  const addPet = useCallback((data: Omit<Pet, 'id'>) => {
    const newPet: Pet = { ...data, id: crypto.randomUUID() };
    setPets((prev) => [...prev, newPet]);
    if (user) {
      savePet(user.uid, newPet)
        .then(() => createPetAlbum(user.uid, newPet.id!, {
          name: 'All Photos',
          photos: [],
          visibility: 'private',
          createdAt: Date.now(),
        }))
        .catch(console.error);
      logActivity(user.uid, `Added pet: ${data.name}`);
    }
  }, [user]);

  const updatePet = useCallback((updated: Pet) => {
    setPets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (user) savePet(user.uid, updated).catch(console.error);
  }, [user]);

  const deletePet = useCallback((id: string) => {
    const petName = pets.find(p => p.id === id)?.name ?? id;
    // Optimistic UI removal
    setPets((prev) => prev.filter((p) => p.id !== id));
    if (user) {
      const uid = user.uid;
      // 1. Firestore pet document
      deletePetDoc(uid, id).catch(console.error);
      // 2. Firestore publicCards for this pet
      deletePublicCardsForPet(uid, id).catch(console.error);
      // 3. Medical records (localStorage)
      localStorage.removeItem(`petbase-medical-${uid}-${id}`);
      // 4. Lost pet status entry (IndexedDB)
      get<{ id: string }[]>('petbase-lost-pets').then(alerts => {
        if (alerts) set('petbase-lost-pets', alerts.filter((a) => a.id !== id)).catch(() => {});
      }).catch(() => {});
      // 5. Local cards (remove cards for this pet; revoke their public entries)
      try {
        const raw = localStorage.getItem('petbase-cards');
        if (raw) {
          const allCards = JSON.parse(raw);
          const kept = allCards.filter((c: any) => c.petId !== id);
          localStorage.setItem('petbase-cards', JSON.stringify(kept));
        }
      } catch { /* ignore corrupt */ }
      logActivity(uid, `Removed pet: ${petName}`);
    }
  }, [user, pets]);

  const contextValue = useMemo(() => ({
    pets,
    loading,
    addPet,
    updatePet,
    deletePet,
  }), [pets, loading, addPet, updatePet, deletePet]);

  return (
    <PetContext.Provider value={contextValue}>
      {children}
    </PetContext.Provider>
  );
}

export function usePets() {
  return useContext(PetContext);
}
