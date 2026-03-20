import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Pet } from '../../types/pet';
import type { PetAlbum, UserAlbum, PhotoEntry, UserDefaultAlbum } from '../../lib/firestoreService';
import {
  subscribePetAlbums, subscribeUserAlbums,
  addPhotosToAlbum, addPhotosToUserDefaultAlbum,
  subscribeUserDefaultAlbum,
  removePhotoFromAlbum,
  createUserAlbum,
  photoEntryUrl
} from '../../lib/firestoreService';
import { uploadAlbumPhoto, uploadUserDefaultPhoto } from '../../lib/storageService';
import { CropModal } from './CropModal';
import { AnimatePresence, motion } from 'motion/react';

interface PhotoManagerModalProps {
  pets: Pet[];
  onClose: () => void;
}

// Grouping helpers
function groupPhotosByTime(photos: (PhotoEntry | string)[]): Array<{ label: string; urls: string[] }> {
  const now = Date.now();
  const twelveMonthsAgo = now - 12 * 30 * 24 * 60 * 60 * 1000;
  const groups = new Map<string, string[]>();

  const sorted = [...photos]
    .map(p => ({ url: photoEntryUrl(p), ts: typeof p === 'string' ? 0 : p.uploadedAt }))
    .sort((a, b) => b.ts - a.ts);

  for (const { url, ts } of sorted) {
    let label: string;
    if (ts === 0) {
      label = 'Older';
    } else if (ts >= twelveMonthsAgo) {
      label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(ts));
    } else {
      label = new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(new Date(ts));
    }
    const existing = groups.get(label) ?? [];
    existing.push(url);
    groups.set(label, existing);
  }
  return Array.from(groups.entries()).map(([label, urls]) => ({ label, urls }));
}

export function PhotoManagerModal({ pets, onClose }: PhotoManagerModalProps) {
  const { user } = useAuth() as { user: { uid: string } | null };
  const uid = user?.uid ?? '';

  const [petAlbumMap, setPetAlbumMap] = useState<Map<string, PetAlbum[]>>(new Map());
  const [userAlbums, setUserAlbums] = useState<UserAlbum[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'albums'>('library');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{ url: string; petId: string; albumId: string; entry: PhotoEntry | string } | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [showNewAlbumInput, setShowNewAlbumInput] = useState(false);
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [uploadTargetPetId, setUploadTargetPetId] = useState<string | null>(pets[0]?.id ?? null);
  const [uploadTargetAlbumId, setUploadTargetAlbumId] = useState<string | null>(null);
  const [availableAlbums, setAvailableAlbums] = useState<Array<{ petId: string; albumId: string; albumName: string; petName: string }>>([]);
  const [userDefaultAlbum, setUserDefaultAlbum] = useState<UserDefaultAlbum>({ photos: [], updatedAt: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubsRef = useRef<(() => void)[]>([]);

  // Subscribe to all pet albums
  useEffect(() => {
    unsubsRef.current.forEach(u => u());
    unsubsRef.current = pets.map(pet =>
      subscribePetAlbums(uid, pet.id, (albums) => {
        setPetAlbumMap(prev => new Map(prev).set(pet.id, albums));
      }, () => {})
    );
    return () => {
      unsubsRef.current.forEach(u => u());
    };
  }, [uid, pets]);

  // Separate effect for user albums — only depends on uid
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeUserAlbums(uid, setUserAlbums, () => {});
    return () => unsub();
  }, [uid]);

  // Build flat available albums list for the upload selector
  useEffect(() => {
    if (!uid) return;
    const unsubs = pets.map(pet =>
      subscribePetAlbums(uid, pet.id!, albums => {
        setAvailableAlbums(prev => [
          ...prev.filter(a => a.petId !== pet.id),
          ...albums.map(a => ({ petId: pet.id!, albumId: a.id!, albumName: a.name, petName: pet.name })),
        ]);
      }, () => {})
    );
    return () => unsubs.forEach(u => u());
  }, [pets, uid]);

  // Subscribe to user Default album (pet-free photos)
  useEffect(() => {
    if (!uid) return;
    return subscribeUserDefaultAlbum(uid, setUserDefaultAlbum);
  }, [uid]);

  // Build flat photo list for the library
  const allPhotos = Array.from(petAlbumMap.entries()).flatMap(([petId, albums]) =>
    albums.flatMap(album => album.photos.map(p => ({
      url: photoEntryUrl(p),
      entry: p,
      petId,
      albumId: album.id,
      petName: pets.find(pet => pet.id === petId)?.name ?? '',
    })))
  );

  // Group by pet then by time
  const petGroups = pets
    .filter(pet => petAlbumMap.has(pet.id) && (petAlbumMap.get(pet.id) ?? []).some(a => a.photos.length > 0))
    .map(pet => {
      const allPetPhotos = (petAlbumMap.get(pet.id) ?? []).flatMap(a => a.photos);
      return {
        pet,
        timeGroups: groupPhotosByTime(allPetPhotos),
      };
    });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploadError(null);
    setUploading(true);
    try {
      if (uploadTargetPetId && uploadTargetAlbumId) {
        const url = await uploadAlbumPhoto(uid, uploadTargetPetId, uploadTargetAlbumId, file);
        const newEntries: PhotoEntry[] = [{ url, uploadedAt: Date.now(), petId: uploadTargetPetId }];
        await addPhotosToAlbum(uid, uploadTargetPetId, uploadTargetAlbumId, newEntries);
      } else {
        const url = await uploadUserDefaultPhoto(uid, file);
        const newEntries: PhotoEntry[] = [{ url, uploadedAt: Date.now() }];
        await addPhotosToUserDefaultAlbum(uid, newEntries);
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (url: string, petId: string, albumId: string, entry: PhotoEntry | string) => {
    if (!uid) return;
    await removePhotoFromAlbum(uid, petId, albumId, entry).catch(() => {});
    setSelectedPhotos(prev => { const next = new Set(prev); next.delete(url); return next; });
  };

  const toggleSelect = (url: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    for (const url of selectedPhotos) {
      const photo = allPhotos.find(p => p.url === url);
      if (photo) await handleDelete(url, photo.petId, photo.albumId, photo.entry);
    }
    setSelectMode(false);
    setSelectedPhotos(new Set());
  };

  const handleCropSave = async (croppedUrl: string) => {
    if (!cropTarget || !uid) return;
    try {
      const res = await fetch(croppedUrl);
      const blob = await res.blob();
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      // Add new cropped photo FIRST before removing original
      const uploadedUrl = await uploadAlbumPhoto(uid, cropTarget.petId, cropTarget.albumId, file);
      await addPhotosToAlbum(uid, cropTarget.petId, cropTarget.albumId, [{
        url: uploadedUrl,
        uploadedAt: Date.now(),
        petId: cropTarget.petId,
      }]);
      // Only remove original after new photo is safely stored
      await removePhotoFromAlbum(uid, cropTarget.petId, cropTarget.albumId, cropTarget.entry);
    } catch {
      setUploadError('Crop upload failed. Please try again.');
    } finally {
      URL.revokeObjectURL(croppedUrl);
      setCropTarget(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="photo-manager-modal-title" className="bg-surface-container rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
            <div className="flex items-center gap-3">
              <h2 id="photo-manager-modal-title" className="text-base font-semibold text-on-surface">Photo Library</h2>
              {allPhotos.length > 0 && (
                <span className="text-xs text-on-surface-variant">{allPhotos.length} photos</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectMode && selectedPhotos.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-error-container text-on-error-container hover:bg-error-container/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span> Delete {selectedPhotos.size}
                </button>
              )}
              <button
                onClick={() => { setSelectMode(v => !v); setSelectedPhotos(new Set()); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectMode ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                {selectMode ? 'Done' : 'Select'}
              </button>
              <div className="flex items-center gap-1.5">
                <select
                  value={uploadTargetAlbumId ?? ''}
                  onChange={e => {
                    const opt = availableAlbums.find(a => a.albumId === e.target.value);
                    setUploadTargetPetId(opt?.petId ?? null);
                    setUploadTargetAlbumId(e.target.value || null);
                  }}
                  className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary max-w-[160px]"
                  aria-label="Select album for upload"
                >
                  <option value="">General (no pet)</option>
                  {availableAlbums.map(a => (
                    <option key={a.albumId} value={a.albumId}>{a.petName} — {a.albumName}</option>
                  ))}
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary hover:bg-primary/90 text-on-primary transition-colors disabled:opacity-50"
                >
                  {uploading ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">upload</span>}
                  Upload
                </button>
              </div>
              <button onClick={onClose} aria-label="Close" title="Close" className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-outline-variant shrink-0">
            {(['library', 'albums'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors focus-visible:outline-none ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                {tab === 'library' ? 'All Photos' : 'Albums'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'library' ? (
                <motion.div
                  key="library"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-5 py-4 space-y-6"
                >
                  {petGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                      <p className="text-sm text-on-surface-variant">No photos yet.</p>
                      <button onClick={() => fileInputRef.current?.click()} className="text-sm text-primary hover:underline">Upload your first photo</button>
                    </div>
                  ) : (
                    petGroups.map(({ pet, timeGroups }) => (
                      <div key={pet.id}>
                        <div className="flex items-center gap-2 mb-3">
                          {pet.image ? (
                            <img src={pet.image} alt={pet.name} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-on-primary-container">{pet.name[0]}</div>
                          )}
                          <span className="text-sm font-semibold text-on-surface">{pet.name}</span>
                        </div>
                        {timeGroups.map(({ label, urls }) => (
                          <div key={label} className="mb-4">
                            <p className="text-xs font-medium text-on-surface-variant mb-2">{label}</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {urls.map((url, i) => {
                                const photo = allPhotos.find(p => p.url === url && p.petId === pet.id);
                                const isSelected = selectedPhotos.has(url);
                                return (
                                  <div key={`${url}-${i}`} className="relative aspect-square group">
                                    <button
                                      onClick={() => selectMode ? toggleSelect(url) : undefined}
                                      className={`w-full h-full rounded-lg overflow-hidden ${selectMode ? 'cursor-pointer' : 'cursor-default'} focus-visible:ring-2 focus-visible:ring-primary outline-none`}
                                    >
                                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                      {selectMode && (
                                        <div className={`absolute inset-0 flex items-center justify-center rounded-lg transition-colors ${isSelected ? 'bg-primary/50' : 'bg-black/0 group-hover:bg-black/20'}`}>
                                          {isSelected && <div className="w-5 h-5 rounded-full bg-primary border-2 border-white" />}
                                        </div>
                                      )}
                                    </button>
                                    {!selectMode && photo && (
                                      <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                                        <button
                                          onClick={() => setCropTarget({ url, petId: photo.petId, albumId: photo.albumId, entry: photo.entry })}
                                          className="p-1 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
                                          aria-label="Crop photo"
                                          title="Crop photo"
                                        >
                                          <span className="material-symbols-outlined text-xs">crop</span>
                                        </button>
                                        <button
                                          onClick={() => handleDelete(url, photo.petId, photo.albumId, photo.entry)}
                                          className="p-1 rounded-md bg-black/50 text-white hover:bg-error/80 transition-colors"
                                          aria-label="Delete photo"
                                          title="Delete photo"
                                        >
                                          <span className="material-symbols-outlined text-xs">delete</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                  {/* General Photos (user Default album) */}
                  {userDefaultAlbum.photos.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">General Photos</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {userDefaultAlbum.photos.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden bg-surface-container">
                            <img src={photoEntryUrl(photo)} alt={`General photo ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {uploadError && <p className="text-xs text-error text-center">{uploadError}</p>}
                </motion.div>
              ) : (
                <motion.div
                  key="albums"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-5 py-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {userAlbums.map(album => (
                      <div key={album.id} className="group relative rounded-xl overflow-hidden bg-surface-container aspect-video">
                        {album.coverPhoto ? (
                          <img src={album.coverPhoto} alt={album.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs">No cover</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                          <div>
                            <p className="text-white text-sm font-medium">{album.name}</p>
                            <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs text-white">{album.photoUrls.length} photo{album.photoUrls.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {showNewAlbumInput ? (
                      <div className="rounded-xl border-2 border-primary p-3 flex flex-col gap-2 aspect-video justify-center">
                        <input
                          autoFocus
                          type="text"
                          value={newAlbumName}
                          onChange={e => setNewAlbumName(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && newAlbumName.trim()) {
                              setSavingAlbum(true);
                              await createUserAlbum(uid, { name: newAlbumName.trim(), photoUrls: [], visibility: 'private', createdAt: Date.now() });
                              setNewAlbumName('');
                              setShowNewAlbumInput(false);
                              setSavingAlbum(false);
                            } else if (e.key === 'Escape') {
                              setNewAlbumName('');
                              setShowNewAlbumInput(false);
                            }
                          }}
                          placeholder="Album name"
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex gap-1.5">
                          <button
                            disabled={!newAlbumName.trim() || savingAlbum}
                            onClick={async () => {
                              if (!newAlbumName.trim()) return;
                              setSavingAlbum(true);
                              await createUserAlbum(uid, { name: newAlbumName.trim(), photoUrls: [], visibility: 'private', createdAt: Date.now() });
                              setNewAlbumName('');
                              setShowNewAlbumInput(false);
                              setSavingAlbum(false);
                            }}
                            className="flex-1 py-1 rounded-lg text-xs font-medium bg-primary hover:bg-primary/90 text-on-primary disabled:opacity-40 transition-colors"
                          >
                            {savingAlbum ? '...' : 'Create'}
                          </button>
                          <button
                            onClick={() => { setNewAlbumName(''); setShowNewAlbumInput(false); }}
                            className="flex-1 py-1 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-high transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewAlbumInput(true)}
                        className="rounded-xl border-2 border-dashed border-outline-variant hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 text-on-surface-variant aspect-video"
                      >
                        <span className="material-symbols-outlined text-2xl">add</span>
                        <span className="text-xs">New Album</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {cropTarget && (
        <CropModal
          imageUrl={cropTarget.url}
          onSave={handleCropSave}
          onClose={() => setCropTarget(null)}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" aria-hidden="true" />
    </>
  );
}
