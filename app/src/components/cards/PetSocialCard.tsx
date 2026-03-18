import { useRef, useCallback, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import type { Pet } from '../../types/pet';
import { formatPetAge } from '../../lib/petAge';
import { canShare } from '../../utils/platform';
import { downloadElementAsImage } from '../../utils/exportImage';

interface PetSocialCardProps {
  pet: Pet;
  onClose: () => void;
}

export function PetSocialCard({ pet, onClose }: PetSocialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const age = formatPetAge(pet.birthday, pet.age);

  const exportAsImage = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      await downloadElementAsImage(cardRef.current, `${pet.name}-petbase.png`);
    } catch {
      // Export failed silently
    } finally {
      setExporting(false);
    }
  }, [pet.name]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-w-[560px] w-full space-y-4">
        {/* Preview card (1:1 ratio for Instagram) */}
        <div
          ref={cardRef}
          className="w-[540px] h-[540px] mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 p-8 flex flex-col items-center justify-center text-center text-white relative"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_80%,white,transparent)]" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            {pet.image ? (
              <img
                src={pet.image}
                alt={pet.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-white/30 shadow-xl"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-5xl border-4 border-white/30">
                🐾
              </div>
            )}
            <h2 className="text-4xl font-extrabold tracking-tight drop-shadow-lg">{pet.name}</h2>
            {pet.breed && <p className="text-lg text-white/80 font-medium">{pet.breed}</p>}
            {age && <p className="text-sm text-white/60">{age}</p>}

            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {pet.favoriteActivities?.slice(0, 3).map(a => (
                <span key={a} className="px-3 py-1 rounded-full bg-white/20 text-sm font-medium">
                  {a}
                </span>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-white/50 text-xs">
              <span>🐾</span>
              <span>PetBase</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={exportAsImage}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-neutral-800 rounded-xl font-medium text-sm hover:bg-neutral-100 disabled:opacity-50 transition-colors"
          >
            {canShare() ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting...' : canShare() ? 'Share' : 'Download'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
