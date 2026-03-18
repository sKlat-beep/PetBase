import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Trash2, Images, Camera, PawPrint } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { usePets } from '../contexts/PetContext';
import type { Pet } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';
import { PetFormModal } from '../components/PetFormModal';
import { MedicalRecordsModal } from '../components/MedicalRecordsModal';
import { LostPetBanner } from '../components/LostPetBanner';
import { writeLostPets, type LostPetAlert } from '../utils/lostPetsApi';
import { PetCard } from '../components/pets/PetCard';
import { PetFAB } from '../components/pets/PetFAB';
import { PetLostConfirmModal } from '../components/pets/PetLostConfirmModal';
import { useHouseholdPermissions } from '../hooks/useHouseholdPermissions';
import { PhotoManagerModal } from '../components/pets/PhotoManagerModal';
import { subscribePetAlbums, photoEntryUrl } from '../lib/firestoreService';
import { lazy, Suspense } from 'react';

const HouseholdPetsPanel = lazy(() =>
  import('../components/HouseholdPetsPanel').then(m => ({ default: m.HouseholdPetsPanel }))
);

const PetDetailModal = lazy(() =>
  import('../components/pets/PetDetailModal').then(m => ({ default: m.PetDetailModal }))
);

function RecentAlbumsPreview({ pets, uid, onViewAll }: { pets: Pet[]; uid: string; onViewAll: () => void }) {
  const [recentAlbums, setRecentAlbums] = useState<Array<{
    petName: string;
    albumName: string;
    coverUrl: string | null;
    photoCount: number;
  }>>([]);

  useEffect(() => {
    if (pets.length === 0) return;
    const unsubs: (() => void)[] = [];
    const albumsByPet = new Map<string, typeof recentAlbums>();

    pets.forEach(pet => {
      if (!pet.id) return;
      const unsub = subscribePetAlbums(uid, pet.id, (albums) => {
        albumsByPet.set(pet.id!, albums.map(a => ({
          petName: pet.name,
          albumName: a.name,
          coverUrl: a.coverPhoto ? photoEntryUrl(a.coverPhoto) : (a.photos[0] ? photoEntryUrl(a.photos[0]) : null),
          photoCount: a.photos.length,
        })));
        // Flatten and take 4 most recent (albums are already ordered createdAt desc)
        const all = Array.from(albumsByPet.values()).flat();
        setRecentAlbums(all.slice(0, 4));
      }, () => {});
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
  }, [pets, uid]);

  if (recentAlbums.length === 0) {
    return (
      <button
        onClick={onViewAll}
        className="w-full text-center py-6 text-sm text-neutral-400 dark:text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl"
      >
        No albums yet — click to create one
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {recentAlbums.map((album, i) => (
        <button
          key={i}
          onClick={onViewAll}
          className="group flex flex-col gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl"
          title={`${album.albumName} — ${album.petName}`}
        >
          <div className="aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            {album.coverUrl
              ? <img src={album.coverUrl} alt={album.albumName} className="w-full h-full object-cover group-hover:scale-105 motion-safe:transition-transform duration-200" />
              : <div className="w-full h-full flex items-center justify-center text-neutral-400"><Images className="w-6 h-6" /></div>
            }
          </div>
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate">{album.albumName}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{album.petName} · {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}</p>
        </button>
      ))}
    </div>
  );
}

export function Pets() {
  const { pets, addPet, updatePet, deletePet, loading } = usePets();
  const { profile, user } = useAuth();
  const { canEditPetInfo, canAddMedicalInfo } = useHouseholdPermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | undefined>(undefined);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [viewingMedicalPet, setViewingMedicalPet] = useState<Pet | null>(null);
  const [targetVaccineName, setTargetVaccineName] = useState<string | undefined>(undefined);
  const [medicalInitialTab, setMedicalInitialTab] = useState<'vaccines' | 'visits'>('vaccines');
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);

  // New state for detail modal and lost confirm modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingDetailPet, setViewingDetailPet] = useState<Pet | null>(null);
  const [isLostConfirmOpen, setIsLostConfirmOpen] = useState(false);
  const [lostConfirmPet, setLostConfirmPet] = useState<Pet | null>(null);
  const [lostConfirmMode, setLostConfirmMode] = useState<'markLost' | 'markFound'>('markLost');

  const [showPhotoManager, setShowPhotoManager] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const deleteModalRef = useRef<HTMLDivElement>(null);

  // Delete modal: Escape to close + focus trap
  useEffect(() => {
    if (!petToDelete) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPetToDelete(null); return; }
      if (e.key !== 'Tab' || !deleteModalRef.current) return;
      const focusable = Array.from(
        deleteModalRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')
      );
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    // Move focus into the modal
    const t = setTimeout(() => deleteModalRef.current?.querySelector<HTMLElement>('button')?.focus(), 50);
    return () => { document.removeEventListener('keydown', handler); clearTimeout(t); };
  }, [petToDelete]);

  // Sync lost pet alerts to IndexedDB so lostPetsApi can surface them in Community/Dashboard
  useEffect(() => {
    const lostAlerts: LostPetAlert[] = pets
      .filter(p => p.lostStatus?.isLost && p.lostStatus.reportedAt > 0)
      .map(p => ({
        id: p.id,
        petName: p.name,
        petType: p.type ?? '',
        breed: p.breed || 'Unknown',
        image: p.image || '',
        ownerName: profile?.displayName || 'PetBase User',
        ownerPhone: 'Contact via PetBase',
        lastSeenLocation: profile?.address || profile?.zipCode || 'Unknown',
        reportedAt: p.lostStatus!.reportedAt,
        zipCode: profile?.zipCode || '',
      }));
    writeLostPets(lostAlerts).catch(() => {});
  }, [pets, profile]);

  useEffect(() => {
    if (location.state?.openAddModal) {
      setEditingPet(undefined);
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.openMedical && pets.length > 0) {
      // Dashboard Quick Actions: "Add Meds" → vaccines tab, "Add Vet Visit" → visits tab
      const tab = location.state.tab === 'vet' ? 'visits' : 'vaccines';
      setViewingMedicalPet(pets[0]);
      setMedicalInitialTab(tab);
      setIsMedicalModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.editPetId && !loading) {
      // Dashboard "Your Pets" widget: click a pet card → open its edit modal
      const target = pets.find(p => p.id === location.state.editPetId);
      if (target) {
        setEditingPet(target);
        setIsModalOpen(true);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, pets, loading]);

  const openAddModal = () => {
    setEditingPet(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (pet: Pet) => {
    setEditingPet(pet);
    setIsModalOpen(true);
  };

  const openMedicalModal = (pet: Pet, vaccineName?: string, tab: 'vaccines' | 'visits' = 'vaccines') => {
    setViewingMedicalPet(pet);
    setTargetVaccineName(vaccineName);
    setMedicalInitialTab(tab);
    setIsMedicalModalOpen(true);
  };

  const handleSave = (data: Omit<Pet, 'id'>) => {
    if (editingPet) {
      updatePet({ ...data, id: editingPet.id });
    } else {
      addPet(data);
    }
  };

  const toggleLostStatus = (pet: Pet) => {
    setLostConfirmPet(pet);
    setLostConfirmMode(pet.lostStatus?.isLost ? 'markFound' : 'markLost');
    setIsLostConfirmOpen(true);
  };

  const confirmLostStatus = () => {
    if (!lostConfirmPet) return;
    if (lostConfirmMode === 'markFound') {
      updatePet({ ...lostConfirmPet, lostStatus: { isLost: false, reportedAt: 0 } });
    } else {
      updatePet({ ...lostConfirmPet, lostStatus: { isLost: true, reportedAt: Date.now() } });
    }
    setIsLostConfirmOpen(false);
    setLostConfirmPet(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white/80 dark:bg-neutral-800/80 rounded-2xl h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <header>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">My Pets</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Detailed profiles and health tracking.</p>
        </header>

        {/* Lost pet banners — one per currently-lost pet */}
        {pets.filter(p => p.lostStatus?.isLost).map(p => {
          const alert: LostPetAlert = {
            id: p.id,
            petName: p.name,
            petType: p.type ?? '',
            breed: p.breed || 'Unknown',
            image: p.image || '',
            ownerName: profile?.displayName || 'PetBase User',
            ownerPhone: 'Contact via PetBase',
            lastSeenLocation: profile?.address || profile?.zipCode || 'Unknown',
            reportedAt: p.lostStatus!.reportedAt,
            zipCode: profile?.zipCode || '',
          };
          return <LostPetBanner key={p.id} lostPet={alert} />;
        })}

        {showPhotoManager && (
          <PhotoManagerModal pets={pets} onClose={() => setShowPhotoManager(false)} />
        )}

        {/* Empty state */}
        {pets.length === 0 && (
          <EmptyState
            icon={<PawPrint className="w-12 h-12" />}
            title="Your pack is waiting!"
            description="Add your first furry friend to get started with PetBase."
            cta={{ label: 'Add a Pet', onClick: openAddModal }}
          />
        )}

        {/* Pet grid — horizontal scroll-snap on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:snap-none sm:pb-0 scrollbar-hide">
          {pets.map(pet => (
            <div key={pet.id} className="min-w-[85vw] sm:min-w-0 snap-center space-y-2">
              <PetCard
                pet={pet}
                onViewDetail={(p) => { setViewingDetailPet(p); setIsDetailModalOpen(true); }}
                onEdit={canEditPetInfo ? openEditModal : undefined}
                onMedical={canAddMedicalInfo ? openMedicalModal : undefined}
                onSetStatus={(p, status) => {
                  updatePet({
                    ...p,
                    ephemeralStatus: status,
                    ephemeralStatusExpiresAt: status ? Date.now() + 24 * 60 * 60 * 1000 : undefined,
                  });
                }}
              />
            </div>
          ))}
        </div>

        {/* Photo Library — shows most recently updated albums */}
        {user && pets.length > 0 && (
          <div className="bg-white/80 dark:bg-neutral-800/80 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Images className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Photo Library</h3>
              </div>
              <button
                onClick={() => setShowPhotoManager(true)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
              >
                View all →
              </button>
            </div>
            <RecentAlbumsPreview pets={pets} uid={user.uid} onViewAll={() => setShowPhotoManager(true)} />
          </div>
        )}

        {/* Household family pets — read-only view of co-members' pets */}
        <Suspense fallback={null}>
          <HouseholdPetsPanel />
        </Suspense>
      </motion.div>

      {/* FAB */}
      <PetFAB onClick={openAddModal} />

      {/* Detail Modal (lazy) */}
      <Suspense fallback={null}>
        <PetDetailModal
          pet={viewingDetailPet}
          pets={pets}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={canEditPetInfo ? (p) => { setIsDetailModalOpen(false); openEditModal(p); } : undefined}
          onMedical={canAddMedicalInfo ? (p) => { setIsDetailModalOpen(false); openMedicalModal(p); } : undefined}
          onToggleLost={toggleLostStatus}
          onDelete={(p) => { setIsDetailModalOpen(false); setPetToDelete(p); }}
          uid={user?.uid}
        />
      </Suspense>

      {/* Lost confirm modal */}
      <PetLostConfirmModal
        isOpen={isLostConfirmOpen}
        pet={lostConfirmPet}
        mode={lostConfirmMode}
        onConfirm={confirmLostStatus}
        onCancel={() => { setIsLostConfirmOpen(false); setLostConfirmPet(null); }}
      />

      <PetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        pet={editingPet}
      />

      <MedicalRecordsModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        pet={viewingMedicalPet}
        targetVaccineName={targetVaccineName}
        initialTab={medicalInitialTab}
      />

      {/* Delete confirmation modal */}
      {petToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setPetToDelete(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-pet-modal-title"
            tabIndex={-1}
            className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-sm p-6 space-y-4 z-10 outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h2 id="delete-pet-modal-title" className="font-bold text-neutral-900 dark:text-neutral-100">Delete {petToDelete.name}?</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              All data for <span className="font-semibold">{petToDelete.name}</span> will be permanently removed — including medical records, shared cards, and lost pet alerts.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPetToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { deletePet(petToDelete.id); setPetToDelete(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
