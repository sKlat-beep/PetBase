import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserProfile } from '../../types/user';
import { uploadMessagePhoto } from '../../lib/storageService';

interface UserPet {
  name?: string;
  photos?: string[];
}

interface PhotoPickerProps {
  onSelect: (photoUrl: string) => void;
  onClose: () => void;
}

type Tab = 'library' | 'upload';

export function PhotoPicker({ onSelect, onClose }: PhotoPickerProps) {
  const { profile, user } = useAuth() as { profile: (UserProfile & { pets?: UserPet[] }) | null; user: { uid: string } | null };
  const [tab, setTab] = useState<Tab>('library');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Build existing photo library
  const allPhotos: string[] = [];
  if (profile?.avatarUrl) allPhotos.push(profile.avatarUrl);
  (profile?.pets ?? []).forEach((pet: UserPet) => {
    pet.photos?.forEach(url => allPhotos.push(url));
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uid = user?.uid;
      if (!uid) { setUploadError('Not signed in.'); return; }
      const url = await uploadMessagePhoto(uid, file);
      onSelect(url);
      onClose();
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected after an error
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <h2 className="text-sm font-semibold text-on-surface">Attach Photo</h2>
          <button
            onClick={onClose}
            aria-label="Close photo picker"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant shrink-0">
          {(['library', 'upload'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                ${tab === t
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {t === 'library' ? 'Your Photos' : 'Upload New'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {tab === 'library' ? (
            allPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <span className="material-symbols-outlined text-[32px] text-outline">add_photo_alternate</span>
                <p className="text-xs text-on-surface-variant">
                  No photos in your library yet.
                </p>
                <button
                  onClick={() => setTab('upload')}
                  className="text-xs text-primary hover:underline"
                >
                  Upload a photo instead
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {allPhotos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    onClick={() => { onSelect(url); onClose(); }}
                    className="rounded-xl overflow-hidden focus-visible:ring-2 focus-visible:ring-primary outline-none hover:opacity-80 transition-opacity aspect-square"
                    aria-label={`Attach photo ${i + 1}`}
                  >
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
                  <p className="text-xs">Uploading…</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 w-full py-8 rounded-2xl border-2 border-dashed border-outline-variant hover:border-primary transition-colors group focus-visible:ring-2 focus-visible:ring-primary outline-none"
                  >
                    <span className="material-symbols-outlined text-[28px] text-outline group-hover:text-primary transition-colors">upload</span>
                    <div className="text-center">
                      <p className="text-sm font-medium text-on-surface-variant">Choose a photo</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">JPG, PNG, GIF, WebP</p>
                    </div>
                  </button>
                  {uploadError && (
                    <p className="text-xs text-error">{uploadError}</p>
                  )}
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
