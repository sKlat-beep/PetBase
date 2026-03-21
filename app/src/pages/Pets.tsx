import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import EmptyState from '../components/ui/EmptyState';
import { usePets } from '../contexts/PetContext';
import type { Pet } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';
import { PetFormModal } from '../components/PetFormModal';
import { PetCardsModal } from '../components/PetCardsModal';
import { MedicalRecordsModal, getVaccineStatus } from '../components/MedicalRecordsModal';
import { LostPetBanner } from '../components/LostPetBanner';
import { writeLostPets, type LostPetAlert } from '../utils/lostPetsApi';
import { PetCard } from '../components/pets/PetCard';
import { PetLostConfirmModal } from '../components/pets/PetLostConfirmModal';
import { useHouseholdPermissions } from '../hooks/useHouseholdPermissions';
import { PhotoManagerModal } from '../components/pets/PhotoManagerModal';
import { subscribePetAlbums, photoEntryUrl } from '../lib/firestoreService';
import { lazy, Suspense } from 'react';

const HouseholdPetsPanel = lazy(() =>
  import('../components/HouseholdPetsPanel').then(m => ({ default: m.HouseholdPetsPanel }))
);


/* ─── Helper: Material Symbol ─────────────────────────────────────────────── */
function MIcon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

/* ─── Recent Albums Preview ───────────────────────────────────────────────── */
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
        className="w-full text-center py-6 text-sm text-on-surface-variant hover:text-primary motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
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
          className="group flex flex-col gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          title={`${album.albumName} — ${album.petName}`}
        >
          <div className="aspect-square rounded-xl overflow-hidden bg-surface-container">
            {album.coverUrl
              ? <img src={album.coverUrl} alt={album.albumName} className="w-full h-full object-cover group-hover:scale-105 motion-safe:transition-transform duration-200" />
              : <div className="w-full h-full flex items-center justify-center text-on-surface-variant"><MIcon name="photo_library" className="text-2xl" /></div>
            }
          </div>
          <p className="text-xs font-medium text-on-surface truncate">{album.albumName}</p>
          <p className="text-xs text-on-surface-variant">{album.petName} · {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}</p>
        </button>
      ))}
    </div>
  );
}

/* ─── Stat Card (bento grid item) ─────────────────────────────────────────── */
function StatCard({ icon, label, value, className = '', spanCols = false }: {
  icon: string;
  label: string;
  value: string;
  className?: string;
  spanCols?: boolean;
}) {
  return (
    <div className={`glass-card p-4 flex flex-col gap-1 ${spanCols ? 'col-span-2' : ''} ${className}`}>
      <div className="flex items-center gap-2 text-on-surface-variant">
        <MIcon name={icon} className="text-xl" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
        {value}
      </p>
    </div>
  );
}

/* ─── Pet Hero Card (cinematic grid item) ─────────────────────────────────── */
function PetHeroCard({ pet, onViewDetail, onEdit, onMedical, onSetStatus }: {
  pet: Pet;
  onViewDetail: (p: Pet) => void;
  onEdit?: (p: Pet) => void;
  onMedical?: (p: Pet) => void;
  onSetStatus?: (p: Pet, status: string | undefined) => void;
}) {
  const healthLabel = pet.lostStatus?.isLost ? 'Lost' : 'Good';
  const healthColor = pet.lostStatus?.isLost
    ? 'bg-error/80 text-on-error'
    : 'bg-secondary/20 text-secondary';

  const tags: string[] = [];
  if (pet.microchipId) tags.push('Microchipped');
  if (pet.spayedNeutered === 'Yes') tags.push('Neutered');
  if (pet.isPrivate) tags.push('Private');

  const hasScheduledCare = pet.medicalVisits && pet.medicalVisits.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden group cursor-pointer"
      onClick={() => onViewDetail(pet)}
    >
      {/* Hero photo */}
      <div className="relative h-64 overflow-hidden">
        {pet.image ? (
          <img
            src={pet.image}
            alt={pet.name}
            className="w-full h-full object-cover group-hover:scale-105 motion-safe:transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-surface-container flex items-center justify-center">
            <MIcon name="pets" className="text-6xl text-on-surface-variant" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Health badge (top-left glass pill) */}
        <div className={`absolute top-3 left-3 glass px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold ${healthColor}`}>
          {!pet.lostStatus?.isLost && (
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          )}
          {pet.lostStatus?.isLost && (
            <MIcon name="warning" className="text-sm" />
          )}
          {healthLabel}
        </div>

        {/* Pet info overlay (bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3
            className="text-2xl font-black text-white text-glow"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {pet.name}
          </h3>
          <p className="text-sm text-white/70">
            {pet.type || 'Pet'}{pet.breed ? ` · ${pet.breed}` : ''}
            {pet.age ? ` · ${pet.age}` : ''}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Alert banner for scheduled care */}
        {hasScheduledCare && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-tertiary-container text-on-tertiary-container text-xs font-medium">
            <MIcon name="calendar_month" className="text-base" />
            <span>{pet.medicalVisits!.length} care item{pet.medicalVisits!.length !== 1 ? 's' : ''} scheduled</span>
          </div>
        )}

        {/* Quick actions row */}
        <div className="flex items-center gap-2 pt-1">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(pet); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-container-high text-on-surface hover:bg-surface-container-highest motion-safe:transition-colors"
              aria-label={`Edit ${pet.name}`}
            >
              <MIcon name="edit" className="text-base" />
              Edit
            </button>
          )}
          {onMedical && (
            <button
              onClick={(e) => { e.stopPropagation(); onMedical(pet); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-container-high text-on-surface hover:bg-surface-container-highest motion-safe:transition-colors"
              aria-label={`Medical records for ${pet.name}`}
            >
              <MIcon name="vaccines" className="text-base" />
              Medical
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Add Pet Placeholder Card ────────────────────────────────────────────── */
function AddPetCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="glass-card h-64 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-outline-variant hover:border-primary motion-safe:transition-colors cursor-pointer group"
      aria-label="Add new pet"
    >
      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-primary-container motion-safe:transition-colors">
        <MIcon name="add" className="text-3xl text-on-surface-variant group-hover:text-on-primary-container motion-safe:transition-colors" />
      </div>
      <span className="text-sm font-semibold text-on-surface-variant group-hover:text-primary motion-safe:transition-colors">
        Add New Pet
      </span>
    </motion.button>
  );
}

/* ─── Main Page Component ─────────────────────────────────────────────────── */
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
  const [searchQuery, setSearchQuery] = useState('');

  // Lost confirm modal
  const [isLostConfirmOpen, setIsLostConfirmOpen] = useState(false);
  const [lostConfirmPet, setLostConfirmPet] = useState<Pet | null>(null);
  const [lostConfirmMode, setLostConfirmMode] = useState<'markLost' | 'markFound'>('markLost');

  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [cardsModalOpen, setCardsModalOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const deleteModalRef = useRef<HTMLDivElement>(null);

  // Filtered pets based on search
  const filteredPets = useMemo(() => {
    if (!searchQuery.trim()) return pets;
    const q = searchQuery.toLowerCase();
    return pets.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.breed && p.breed.toLowerCase().includes(q)) ||
      (p.type && p.type.toLowerCase().includes(q))
    );
  }, [pets, searchQuery]);

  // Stat computations
  const activePetCount = pets.length;
  const healthSummary = useMemo(() => {
    const lostCount = pets.filter(p => p.lostStatus?.isLost).length;
    if (lostCount > 0) return `${lostCount} Lost`;

    let overdueCount = 0;
    let dueSoonCount = 0;
    for (const pet of pets) {
      const vaccines = (pet as any).vaccines as { nextDueDate: string }[] | undefined;
      if (!vaccines) continue;
      for (const v of vaccines) {
        if (!v.nextDueDate) continue;
        const status = getVaccineStatus(v.nextDueDate);
        if (status === 'overdue') overdueCount++;
        else if (status === 'due-soon') dueSoonCount++;
      }
    }
    if (overdueCount > 0) return `${overdueCount} Overdue`;
    if (dueSoonCount > 0) return `${dueSoonCount} Due Soon`;
    return 'Optimal';
  }, [pets]);

  const nextCheckup = useMemo(() => {
    // Find soonest upcoming date across medical visits and vaccine due dates
    const now = new Date();
    let soonest: { petName: string; date: string } | null = null;
    for (const pet of pets) {
      // Check medical visits
      if (pet.medicalVisits) {
        for (const visit of pet.medicalVisits) {
          const d = new Date(visit.date);
          if (d > now && (!soonest || d < new Date(soonest.date))) {
            soonest = { petName: pet.name, date: visit.date };
          }
        }
      }
      // Check vaccine nextDueDate fields
      const vaccines = (pet as any).vaccines as { nextDueDate: string }[] | undefined;
      if (vaccines) {
        for (const v of vaccines) {
          if (!v.nextDueDate) continue;
          const d = new Date(v.nextDueDate);
          if (d > now && (!soonest || d < new Date(soonest.date))) {
            soonest = { petName: pet.name, date: v.nextDueDate };
          }
        }
      }
    }
    if (soonest) {
      const d = new Date(soonest.date);
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${soonest.petName}`;
    }
    return 'None scheduled';
  }, [pets]);

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
    const t = setTimeout(() => deleteModalRef.current?.querySelector<HTMLElement>('button')?.focus(), 50);
    return () => { document.removeEventListener('keydown', handler); clearTimeout(t); };
  }, [petToDelete]);

  // Sync lost pet alerts to IndexedDB
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

  // Location state handlers (add modal, medical, edit)
  useEffect(() => {
    if (location.state?.openAddModal) {
      setEditingPet(undefined);
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.openMedical && pets.length > 0) {
      const tab = location.state.tab === 'vet' ? 'visits' : 'vaccines';
      setViewingMedicalPet(pets[0]);
      setMedicalInitialTab(tab);
      setIsMedicalModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.editPetId && !loading) {
      const target = pets.find(p => p.id === location.state.editPetId);
      if (target) {
        setEditingPet(target);
        setIsModalOpen(true);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, pets, loading]);

  // Auto-open cards modal via query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openCards') === 'true') {
      setCardsModalOpen(true);
      navigate('/pets', { replace: true });
    }
  }, [location.search, navigate]);

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

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 rounded-2xl bg-surface-container animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="glass-card h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="glass-card h-80 animate-pulse" />
          ))}
        </div>
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
        {/* ── Top Header ─────────────────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-black text-on-surface tracking-tight text-glow"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              My Pet Family
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              {activePetCount} pet{activePetCount !== 1 ? 's' : ''} in your family
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="relative">
              <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl" />
              <input
                type="text"
                placeholder="Search pets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-full bg-surface-container text-on-surface text-sm placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary w-48 sm:w-64"
              />
            </div>
            {/* Notification icon */}
            <button
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface motion-safe:transition-colors"
              aria-label="Notifications"
            >
              <MIcon name="notifications" className="text-xl" />
            </button>
          </div>
        </header>

        {/* ── Stat Row (4-col bento grid) ────────────────────────────────── */}
        {pets.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="pets" label="Active Pets" value={String(activePetCount)} />
            <div className="glass-card p-4 flex flex-col gap-1 border-l-4 border-secondary">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <MIcon name="monitor_heart" className="text-xl" />
                <span className="text-xs font-medium uppercase tracking-wider">Health Status</span>
              </div>
              <p className="text-2xl font-black text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
                {healthSummary}
              </p>
            </div>
            <div
              className="glass-card col-span-2 p-4 flex flex-col gap-1"
              style={{ background: 'linear-gradient(135deg, var(--tertiary-container), var(--tertiary-container))' }}
            >
              <div className="flex items-center gap-2 text-on-tertiary-container">
                <MIcon name="event" className="text-xl" />
                <span className="text-xs font-medium uppercase tracking-wider">Next Checkup</span>
              </div>
              <p className="text-2xl font-black text-on-tertiary-container" style={{ fontFamily: 'var(--font-headline)' }}>
                {nextCheckup}
              </p>
            </div>
          </div>
        )}

        {/* ── Lost pet banners ───────────────────────────────────────────── */}
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

        {/* ── Identity Cards hero button ─────────────────────────────────── */}
        {pets.length > 0 && (
          <button
            onClick={() => setCardsModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary-container to-tertiary-container flex items-center gap-4 hover:brightness-105 transition-all group"
          >
            <span className="material-symbols-outlined text-[32px] text-on-primary-container">id_card</span>
            <div className="text-left flex-1">
              <p className="text-base font-bold text-on-primary-container">Identity Cards</p>
              <p className="text-xs text-on-primary-container/70">Create, share &amp; manage digital pet ID cards</p>
            </div>
            <span className="material-symbols-outlined text-on-primary-container/60 group-hover:translate-x-1 transition-transform">chevron_right</span>
          </button>
        )}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {pets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center mb-6">
              <MIcon name="pets" className="text-5xl text-on-surface-variant" />
            </div>
            <h3
              className="text-xl font-bold text-on-surface mb-2"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              Your stage is empty
            </h3>
            <p className="text-sm text-on-surface-variant max-w-xs mb-6 leading-relaxed">
              Add your first furry friend to get started with PetBase.
            </p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 min-h-[44px] bg-primary text-on-primary rounded-full text-sm font-semibold hover:opacity-90 active:scale-[0.97] motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Add a Pet
            </button>
          </div>
        )}

        {/* ── Pet Card Grid (3-col xl, 2 lg, 1 mobile) ──────────────────── */}
        {filteredPets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPets.map(pet => (
              <PetHeroCard
                key={pet.id}
                pet={pet}
                onViewDetail={openEditModal}
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
            ))}

            {/* Add New Pet placeholder card */}
            <AddPetCard onClick={openAddModal} />
          </div>
        )}

        {/* Search with no results */}
        {searchQuery.trim() && filteredPets.length === 0 && pets.length > 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <MIcon name="search_off" className="text-5xl text-on-surface-variant mb-3" />
            <p className="text-on-surface-variant text-sm">No pets match "{searchQuery}"</p>
          </div>
        )}

        {/* ── Photo Library ──────────────────────────────────────────────── */}
        {user && pets.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MIcon name="photo_library" className="text-lg text-on-surface-variant" />
                <h3 className="text-sm font-semibold text-on-surface">Photo Library</h3>
              </div>
              <button
                onClick={() => setShowPhotoManager(true)}
                className="text-xs text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                View all
              </button>
            </div>
            <RecentAlbumsPreview pets={pets} uid={user.uid} onViewAll={() => setShowPhotoManager(true)} />
          </div>
        )}

        {/* ── Household family pets ──────────────────────────────────────── */}
        <Suspense fallback={null}>
          <HouseholdPetsPanel />
        </Suspense>
      </motion.div>

      {/* ── Floating Action Button (bottom-right, primary-container) ─────── */}
      <motion.button
        onClick={openAddModal}
        className="fixed bottom-6 right-6 z-40 bg-primary-container text-on-primary-container shadow-2xl rounded-full p-4"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label="Add pet"
      >
        <MIcon name="add" className="text-2xl" />
      </motion.button>

      {/* ── Lost confirm modal ───────────────────────────────────────────── */}
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
        onDelete={(p) => { setIsModalOpen(false); setPetToDelete(p); }}
        onToggleLost={toggleLostStatus}
        onSwitchPet={(p) => setEditingPet(p)}
      />

      <MedicalRecordsModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        pet={viewingMedicalPet}
        targetVaccineName={targetVaccineName}
        initialTab={medicalInitialTab}
      />

      <PetCardsModal isOpen={cardsModalOpen} onClose={() => setCardsModalOpen(false)} />

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
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
            className="relative glass-card w-full max-w-sm p-6 space-y-4 z-10 outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
                <MIcon name="delete" className="text-xl text-on-error-container" />
              </div>
              <div>
                <h2 id="delete-pet-modal-title" className="font-bold text-on-surface">Delete {petToDelete.name}?</h2>
                <p className="text-sm text-on-surface-variant">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant">
              All data for <span className="font-semibold text-on-surface">{petToDelete.name}</span> will be permanently removed — including medical records, shared cards, and lost pet alerts.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPetToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-outline text-on-surface font-semibold text-sm hover:bg-surface-container motion-safe:transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { deletePet(petToDelete.id); setPetToDelete(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-error hover:opacity-90 text-on-error font-semibold text-sm motion-safe:transition-opacity"
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
