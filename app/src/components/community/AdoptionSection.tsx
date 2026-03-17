import { useState } from 'react';
import { Heart, MapPin, Plus, X } from 'lucide-react';
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
    <section className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-2xl border border-stone-100 dark:border-stone-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-stone-900 dark:text-stone-50 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" /> Rescue & Adoption
        </h2>
        <button onClick={() => setShowCreate(v => !v)}
          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={form.petName} onChange={e => setForm({ ...form, petName: e.target.value })} placeholder="Pet name*" className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
                <select value={form.petType} onChange={e => setForm({ ...form, petType: e.target.value })} className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100">
                  {['Dog', 'Cat', 'Rabbit', 'Bird', 'Reptile', 'Fish', 'Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} placeholder="Breed" className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
                <input type="text" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
              </div>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description..." rows={2} className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 resize-none" />
              <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location (city, state)" className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} placeholder="Contact name" className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
                <input type="text" value={form.contactInfo} onChange={e => setForm({ ...form, contactInfo: e.target.value })} placeholder="Phone or email" className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-1.5 text-xs text-stone-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700">Cancel</button>
                <button onClick={handleCreate} disabled={!form.petName.trim()} className="flex-1 py-1.5 text-xs bg-rose-500 text-white rounded-lg disabled:opacity-40">List Pet</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {available.length === 0 ? (
        <EmptyState icon={<Heart className="w-10 h-10" />} title="No listings yet" description="Be the first to list a pet for adoption in your community." />
      ) : (
        <div className="space-y-3">
          {available.slice(0, 6).map(listing => (
            <div key={listing.id} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-700/30 border border-stone-100 dark:border-stone-600">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{listing.petName}</p>
                  <p className="text-xs text-stone-500">{listing.petType}{listing.breed ? ` · ${listing.breed}` : ''}{listing.age ? ` · ${listing.age}` : ''}</p>
                </div>
                {listing.listedBy === user?.uid && (
                  <button onClick={() => markAdopted(listing.id)} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    Mark Adopted
                  </button>
                )}
              </div>
              {listing.description && <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">{listing.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-400">
                {listing.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{listing.location}</span>}
                <span>Contact: {listing.contactName || listing.contactInfo}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
