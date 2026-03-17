import { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, ImagePlus } from 'lucide-react';
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
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 shrink-0">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Attach Photo</h2>
          <button
            onClick={onClose}
            aria-label="Close photo picker"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-700 shrink-0">
          {(['library', 'upload'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none
                ${tab === t
                  ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
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
                <ImagePlus className="w-8 h-8 text-stone-300 dark:text-stone-600" />
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  No photos in your library yet.
                </p>
                <button
                  onClick={() => setTab('upload')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
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
                    className="rounded-xl overflow-hidden focus-visible:ring-2 focus-visible:ring-sky-500 outline-none hover:opacity-80 transition-opacity aspect-square"
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
                <div className="flex flex-col items-center gap-2 text-stone-500 dark:text-stone-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-xs">Uploading…</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 w-full py-8 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-600 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors group"
                  >
                    <Upload className="w-7 h-7 text-stone-300 dark:text-stone-600 group-hover:text-emerald-500 transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Choose a photo</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">JPG, PNG, GIF, WebP</p>
                    </div>
                  </button>
                  {uploadError && (
                    <p className="text-xs text-rose-500 dark:text-rose-400">{uploadError}</p>
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
