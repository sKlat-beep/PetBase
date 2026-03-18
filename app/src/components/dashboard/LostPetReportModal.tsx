import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, SearchX, Upload, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import type { Pet } from '../../types/pet';
import { savePet } from '../../lib/firestoreService';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  pets: Pet[];
  onClose: () => void;
  onSaved?: (petId: string) => void;
}

export default function LostPetReportModal({ pets, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedPet = pets.find(p => p.id === selectedPetId);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(prev => [...prev, reader.result as string].slice(0, 6));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!user || !selectedPet) return;
    setSaveError(null);
    setSaving(true);
    try {
      await savePet(user.uid, {
        ...selectedPet,
        lostStatus: {
          isLost: true,
          reportedAt: Date.now(),
          description: description.trim() || undefined,
          additionalPhotos: photos.length > 0 ? photos : undefined,
        },
      });
      onSaved?.(selectedPetId);
      onClose();
    } catch (err) {
      console.error('Failed to report lost pet', err);
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Report a lost pet"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-amber-500 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <SearchX className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-bold text-lg">Report Lost Pet</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === 1 && (
            <>
              {/* Pet selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
                  Which pet is lost?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pets.map(pet => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                        selectedPetId === pet.id
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
                          : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                      }`}
                    >
                      {pet.image
                        ? <img src={pet.image} alt={pet.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-bold shrink-0">{pet.name[0]}</div>
                      }
                      <span className="font-medium text-sm truncate">{pet.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="lost-description" className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  id="lost-description"
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={`Help others identify ${selectedPet?.name ?? 'your pet'}:\n• When was ${selectedPet?.name ?? 'they'} last seen? (date, time, location)\n• What were they wearing? (collar color, tags)\n• What were they doing when last seen?\n• Any distinctive markings or behaviors?\n• Your contact info (optional)`}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Uploading additional photos helps the community identify <strong>{selectedPet?.name}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
                  Additional Photos (up to 6)
                </label>
                <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handlePhotoSelect} aria-label="Upload lost pet photos" />
                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-700 dark:hover:text-amber-400 motion-safe:transition-colors min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-medium">Upload Photos</span>
                  </button>
                )}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {photos.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          aria-label={`Remove photo ${i + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {saveError && (
          <p className="px-5 pb-2 text-xs text-red-500 text-center">{saveError}</p>
        )}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              disabled={!selectedPetId}
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {saving ? 'Reporting…' : 'Report Lost Pet'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
