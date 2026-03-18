import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PawPrint, User } from 'lucide-react';
import { getAvatarUrl } from '../lib/tokenService';
import { getPublicPetsForUser, type PublicPetSummary } from '../lib/firestoreService';
import type { PublicProfile } from '../contexts/SocialContext';

const STATUS_LABELS: Record<string, string> = {
  'None': '',
  'Open to Playdates': '🐾 Open to Playdates',
  'Looking for Walking Buddies': '🦮 Looking for Walking Buddies',
};

interface PublicProfilePanelProps {
  profile: PublicProfile;
  onClose: () => void;
}

export function PublicProfilePanel({ profile, onClose }: PublicProfilePanelProps) {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [pets, setPets] = useState<PublicPetSummary[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Focus trap: cycle Tab within dialog
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  useEffect(() => {
    getAvatarUrl(profile.uid, profile.avatarUrl).then(setAvatarUrl).catch(() => setAvatarUrl(''));
  }, [profile.uid, profile.avatarUrl]);

  useEffect(() => {
    setLoadingPets(true);
    getPublicPetsForUser(profile.uid)
      .then(setPets)
      .catch(() => setPets([]))
      .finally(() => setLoadingPets(false));
  }, [profile.uid]);

  const statusLabel = STATUS_LABELS[profile.publicStatus] || '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onMouseDown={onClose}
        aria-hidden="true"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-panel-title"
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative w-full sm:max-w-sm bg-white/75 dark:bg-neutral-900/75 backdrop-blur-xl
                   border border-white/20 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/30
                   rounded-t-2xl sm:rounded-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-200/60 dark:border-neutral-700/60">
          <h2 id="profile-panel-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Profile
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close profile panel"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
                       text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200
                       hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors
                       focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.displayName}
                width={64}
                height={64}
                className="w-16 h-16 rounded-2xl object-cover bg-neutral-100 dark:bg-neutral-800 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-neutral-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate text-base">
                {profile.displayName}
              </p>
              {profile.username && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                  @{profile.username.split('#')[0]}
                  <span className="opacity-60">#{profile.username.split('#')[1]}</span>
                </p>
              )}
              {statusLabel && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{statusLabel}</p>
              )}
            </div>
          </div>

          {/* Public pets */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-1.5">
              <PawPrint className="w-3.5 h-3.5" />
              Pets
            </h3>
            {loadingPets ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : pets.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-3">No public pets.</p>
            ) : (
              <ul className="space-y-2.5">
                {pets.map(pet => (
                  <li
                    key={pet.id}
                    className="flex items-start gap-3 px-3 py-3 rounded-xl
                               bg-neutral-50 dark:bg-neutral-800/60
                               border border-neutral-100 dark:border-neutral-700/50"
                  >
                    {pet.image ? (
                      <img
                        src={pet.image}
                        alt={pet.name}
                        className="w-10 h-10 rounded-xl object-cover bg-neutral-100 dark:bg-neutral-800 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <PawPrint className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {pet.name}
                      </p>
                      {(pet.breed || pet.type) && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {[pet.type, pet.breed].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {/* Optional public fields as info chips */}
                      {(pet.weight || pet.activity || pet.likes?.length || pet.food) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {pet.weight && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700/60 text-[10px] text-neutral-600 dark:text-neutral-400">{pet.weight}</span>
                          )}
                          {pet.activity && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/30 text-[10px] text-violet-600 dark:text-violet-400">{pet.activity}</span>
                          )}
                          {pet.likes?.slice(0, 3).map(l => (
                            <span key={l} className="inline-flex px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-[10px] text-emerald-600 dark:text-emerald-400">{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
