import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import EmptyState from '../ui/EmptyState';

interface AdoptionListing {
  id: string;
  petName: string;
  petType: string;
  breed: string;
  age: string;
  description: string;
  location: string;
  contactName: string;
  contactInfo: string;
  imageUrl?: string;
  listedBy: string;
  listedByName: string;
  createdAt: number;
  status: 'available' | 'adopted';
}

const STORAGE_KEY = 'petbase-adoptions';

function loadListings(): AdoptionListing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveListings(listings: AdoptionListing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

export default function AdoptionSection() {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<AdoptionListing[]>(loadListings);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    petName: '', petType: 'Dog', breed: '', age: '', description: '', location: '', contactName: '', contactInfo: '',
  });

  const handleCreate = () => {
    if (!user || !form.petName.trim()) return;
    const listing: AdoptionListing = {
      id: crypto.randomUUID(),
      ...form,
      listedBy: user.uid,
      listedByName: user.displayName || 'Anonymous',
      createdAt: Date.now(),
      status: 'available',
    };
    const updated = [listing, ...listings];
    setListings(updated);
    saveListings(updated);
    setShowCreate(false);
    setForm({ petName: '', petType: 'Dog', breed: '', age: '', description: '', location: '', contactName: '', contactInfo: '' });
  };

  const markAdopted = (id: string) => {
    const updated = listings.map(l => l.id === id ? { ...l, status: 'adopted' as const } : l);
    setListings(updated);
    saveListings(updated);
  };

  const available = listings.filter(l => l.status === 'available');

  return (
    <section className="bg-surface-container-low backdrop-blur-sm rounded-2xl border border-outline-variant p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-error">favorite</span> Rescue & Adoption
        </h2>
        <button onClick={() => setShowCreate(v => !v)}
          className="p-1.5 rounded-lg text-primary hover:bg-primary-container">
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-error-container rounded-xl border border-error/20 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={form.petName} onChange={e => setForm({ ...form, petName: e.target.value })} placeholder="Pet name*" className="px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface" />
                <select value={form.petType} onChange={e => setForm({ ...form, petType: e.target.value })} className="px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface">
                  {['Dog', 'Cat', 'Rabbit', 'Bird', 'Reptile', 'Fish', 'Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} placeholder="Breed" className="px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface" />
                <input type="text" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" className="px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface" />
              </div>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description..." rows={2} className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface resize-none" />
              <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location (city, state)" className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Contact name" className="px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface" />
                <input type="text" value={form.contactInfo} onChange={e => setForm({ ...form, contactInfo: e.target.value })} placeholder="Phone or email" className="px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-1.5 text-xs text-on-surface-variant rounded-lg hover:bg-surface-container-high">Cancel</button>
                <button onClick={handleCreate} disabled={!form.petName.trim()} className="flex-1 py-1.5 text-xs bg-error text-on-error rounded-lg disabled:opacity-40">List Pet</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {available.length === 0 ? (
        <EmptyState icon={<span className="material-symbols-outlined text-[40px]">favorite</span>} title="No listings yet" description="Be the first to list a pet for adoption in your community." />
      ) : (
        <div className="space-y-3">
          {available.slice(0, 6).map(listing => (
            <div key={listing.id} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">{listing.petName}</p>
                  <p className="text-xs text-on-surface-variant">{listing.petType}{listing.breed ? ` · ${listing.breed}` : ''}{listing.age ? ` · ${listing.age}` : ''}</p>
                </div>
                {listing.listedBy === user?.uid && (
                  <button onClick={() => markAdopted(listing.id)} className="text-xs px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container">
                    Mark Adopted
                  </button>
                )}
              </div>
              {listing.description && <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{listing.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-on-surface-variant">
                {listing.location && <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">location_on</span>{listing.location}</span>}
                <span>Contact: {listing.contactName || listing.contactInfo}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
