import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg"
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
        className="glass-morphism rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-tertiary p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-on-tertiary">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">person_search</span>
            <h2 className="font-bold text-lg">Report Lost Pet</h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-tertiary/80 hover:text-on-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-tertiary rounded"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === 1 && (
            <>
              {/* Pet selector */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                  Which pet is lost?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pets.map(pet => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container ${
                        selectedPetId === pet.id
                          ? 'border-tertiary bg-tertiary-container text-on-tertiary-container'
                          : 'border-outline-variant hover:bg-surface-container-high/40 text-on-surface'
                      }`}
                    >
                      {pet.image
                        ? <img src={pet.image} alt={pet.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-bold shrink-0 text-on-surface-variant">{pet.name[0]}</div>
                      }
                      <span className="font-medium text-sm truncate">{pet.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="lost-description" className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  id="lost-description"
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={`Help others identify ${selectedPet?.name ?? 'your pet'}:\n• When was ${selectedPet?.name ?? 'they'} last seen? (date, time, location)\n• What were they wearing? (collar color, tags)\n• What were they doing when last seen?\n• Any distinctive markings or behaviors?\n• Your contact info (optional)`}
                  className="w-full px-4 py-3 rounded-xl border-0 bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary-container/40 border border-secondary/20">
                <span className="material-symbols-outlined text-base text-secondary shrink-0" aria-hidden="true">info</span>
                <p className="text-sm text-on-surface">
                  Uploading additional photos helps the community identify <strong>{selectedPet?.name}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                  Additional Photos (up to 6)
                </label>
                <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handlePhotoSelect} aria-label="Upload lost pet photos" />
                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-outline text-on-surface-variant hover:border-tertiary hover:text-tertiary motion-safe:transition-colors min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">add_photo_alternate</span>
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
                          className="absolute top-1 right-1 bg-black/60 text-on-surface rounded-full p-1 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface"
                          aria-label={`Remove photo ${i + 1}`}
                        >
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
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
          <p className="px-5 pb-2 text-xs text-error text-center">{saveError}</p>
        )}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high/40 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">chevron_left</span> Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container-high/40 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container">
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              disabled={!selectedPetId}
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-tertiary hover:bg-tertiary-fixed-dim text-on-tertiary disabled:opacity-50 disabled:cursor-not-allowed motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              Next <span className="material-symbols-outlined text-base" aria-hidden="true">chevron_right</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider bg-tertiary hover:bg-tertiary-fixed-dim text-on-tertiary disabled:opacity-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              {saving ? 'Reporting...' : 'Create Alert'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
