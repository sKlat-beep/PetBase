import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAvatarUrl } from '../lib/tokenService';
import { getPublicPetsForUser, type PublicPetSummary } from '../lib/firestoreService';
import type { PublicProfile } from '../contexts/SocialContext';
import { SpiritIconBadge } from './gamification/TierCrest';

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
        className="relative w-full sm:max-w-sm glass-morphism
                   shadow-xl rounded-t-2xl sm:rounded-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-outline-variant/60">
          <h2 id="profile-panel-title" className="text-lg font-bold text-on-surface">
            Profile
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close profile panel"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
                       text-on-surface-variant hover:text-on-surface
                       hover:bg-surface-container-high transition-colors
                       focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.displayName}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-2xl object-cover bg-surface-container"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px] text-on-surface-variant">person</span>
                </div>
              )}
              {profile.publicCrestEnabled && profile.publicSpiritIcon && profile.publicTierColor && (
                <SpiritIconBadge
                  spiritIcon={profile.publicSpiritIcon}
                  tierColor={profile.publicTierColor}
                  size={20}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-on-surface truncate text-base">
                {profile.displayName}
              </p>
              {profile.username && (
                <p className="text-sm text-on-surface-variant truncate">
                  @{profile.username.split('#')[0]}
                  <span className="opacity-60">#{profile.username.split('#')[1]}</span>
                </p>
              )}
              {statusLabel && (
                <p className="text-sm text-on-surface-variant mt-0.5">{statusLabel}</p>
              )}
            </div>
          </div>

          {/* Public pets */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">pets</span>
              Pets
            </h3>
            {loadingPets ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-surface-container animate-pulse" />
                ))}
              </div>
            ) : pets.length === 0 ? (
              <p className="text-sm text-on-surface-variant/60 text-center py-3">No public pets.</p>
            ) : (
              <ul className="space-y-2.5">
                {pets.map(pet => (
                  <li
                    key={pet.id}
                    className="flex items-start gap-3 px-3 py-3 rounded-xl
                               bg-surface-container-low
                               border border-outline-variant/50"
                  >
                    {pet.image ? (
                      <img
                        src={pet.image}
                        alt={pet.name}
                        className="w-10 h-10 rounded-xl object-cover bg-surface-container shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">pets</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {pet.name}
                      </p>
                      {(pet.breed || pet.type) && (
                        <p className="text-xs text-on-surface-variant truncate">
                          {[pet.type, pet.breed].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {/* Optional public fields as info chips */}
                      {(pet.weight || pet.activity || pet.likes?.length || pet.food) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {pet.weight && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-surface-container-high text-xs text-on-surface-variant">{pet.weight}</span>
                          )}
                          {pet.activity && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-tertiary-container text-xs text-on-tertiary-container">{pet.activity}</span>
                          )}
                          {pet.likes?.slice(0, 3).map(l => (
                            <span key={l} className="inline-flex px-1.5 py-0.5 rounded-md bg-primary-container text-xs text-on-primary-container">{l}</span>
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
