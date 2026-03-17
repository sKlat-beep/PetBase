import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Trash2, Upload, Loader2, Check, FolderInput } from 'lucide-react';
import {
  updatePetAlbum,
  deletePetAlbum,
  addPhotosToAlbum,
  removePhotoFromAlbum,
  subscribePetAlbums,
  photoEntryUrl,
  type PetAlbum,
  type PhotoEntry,
} from '../../lib/firestoreService';
import { PhotoPicker } from '../messaging/PhotoPicker';
import { ImageLightbox } from '../ui/ImageLightbox';

interface AlbumDetailModalProps {
  album: PetAlbum;
  ownerUid: string;
  petId: string;
  isOwner: boolean;
  onClose: () => void;
  onAlbumUpdate: (updatedAlbum: PetAlbum) => void;
  onAlbumDeleted: (albumId: string) => void;
}

const VISIBILITY_LABELS: Record<PetAlbum['visibility'], string> = {
  public: 'Public',
  friends: 'Friends',
  private: 'Private',
};

const VISIBILITY_COLORS: Record<PetAlbum['visibility'], string> = {
  public: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  friends: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  private: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
};

export function AlbumDetailModal({
  album,
  ownerUid,
  petId,
  isOwner,
  onClose,
  onAlbumUpdate,
  onAlbumDeleted,
}: AlbumDetailModalProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(album.name);
  const [savingName, setSavingName] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  const [movingPhotoIdx, setMovingPhotoIdx] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [siblingAlbums, setSiblingAlbums] = useState<PetAlbum[]>([]);

  // Keep nameInput in sync if album name changes from outside
  useEffect(() => {
    setNameInput(album.name);
  }, [album.name]);

  // Load sibling albums for the same pet (used by move-photo dropdown)
  useEffect(() => {
    if (!ownerUid || !petId) return;
    const unsub = subscribePetAlbums(ownerUid, petId, setSiblingAlbums, () => {});
    return () => unsub();
  }, [ownerUid, petId]);

  // ESC: close lightbox first, then modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, onClose]);

  const applyUpdate = useCallback(
    async (updates: Partial<Omit<PetAlbum, 'id' | 'createdAt'>>) => {
      const updated: PetAlbum = { ...album, ...updates };
      onAlbumUpdate(updated); // optimistic
      await updatePetAlbum(ownerUid, petId, album.id, updates);
    },
    [album, ownerUid, petId, onAlbumUpdate],
  );

  const saveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === album.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await applyUpdate({ name: nameInput.trim() });
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  };

  const handlePhotoPickerSelect = async (url: string) => {
    const entry: PhotoEntry = { url, uploadedAt: Date.now(), petId };
    // Optimistic update
    const newPhotos = [...album.photos, entry];
    const newCover = album.coverPhoto ?? url;
    onAlbumUpdate({ ...album, photos: newPhotos, coverPhoto: newCover });
    await addPhotosToAlbum(ownerUid, petId, album.id, [entry]);
    setShowPhotoPicker(false);
  };

  const handleDeletePhoto = async (index: number) => {
    const entry = album.photos[index];
    // Optimistic update
    const newPhotos = album.photos.filter((_, i) => i !== index);
    const deletedUrl = photoEntryUrl(entry);
    const newCover = newPhotos.length > 0
      ? (album.coverPhoto === deletedUrl ? photoEntryUrl(newPhotos[0]) : album.coverPhoto)
      : undefined;
    onAlbumUpdate({ ...album, photos: newPhotos, coverPhoto: newCover });
    await removePhotoFromAlbum(ownerUid, petId, album.id, entry);
    // Close lightbox if we deleted the viewed photo
    if (lightboxIndex !== null) {
      if (newPhotos.length === 0) {
        setLightboxIndex(null);
      } else {
        setLightboxIndex(Math.min(lightboxIndex, newPhotos.length - 1));
      }
    }
  };

  const handleMovePhoto = async (index: number, targetAlbumId: string) => {
    setMoveError(null);
    try {
      const entry = album.photos[index];
      if (typeof entry === 'string') return; // legacy string photos can't be moved
      await addPhotosToAlbum(ownerUid, petId, targetAlbumId, [entry]);
      await handleDeletePhoto(index);
      setMovingPhotoIdx(null);
    } catch (err) {
      console.error('Failed to move photo', err);
      setMoveError('Failed to move photo. Please try again.');
      setMovingPhotoIdx(null);
    }
  };

  const handleDeleteAlbum = async () => {
    setDeleting(true);
    try {
      await deletePetAlbum(ownerUid, petId, album.id);
      onAlbumDeleted(album.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleVisibilityChange = async (v: PetAlbum['visibility']) => {
    await applyUpdate({ visibility: v });
  };

  return (
    <>
      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div role="dialog" aria-modal="true" aria-labelledby="album-detail-modal-title" className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0 gap-3">
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveName();
                      if (e.key === 'Escape') { setEditingName(false); setNameInput(album.name); }
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    disabled={savingName}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    aria-label="Save album name"
                    title="Save album name"
                  >
                    {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 id="album-detail-modal-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {album.name}
                  </h2>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                      aria-label="Rename album"
                      title="Rename album"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VISIBILITY_COLORS[album.visibility]}`}>
                  {VISIBILITY_LABELS[album.visibility]}
                </span>
                <span className="text-xs text-neutral-400">
                  {album.photos.length} photo{album.photos.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
              aria-label="Close"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 flex-1">
            {/* Visibility toggle (owner only) */}
            {isOwner && (
              <div className="flex gap-2">
                {(['public', 'friends', 'private'] as PetAlbum['visibility'][]).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleVisibilityChange(v)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      album.visibility === v
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:border-emerald-400'
                    }`}
                  >
                    {VISIBILITY_LABELS[v]}
                  </button>
                ))}
              </div>
            )}

            {/* Photo grid */}
            {album.photos.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-sm">
                No photos yet. Add some below.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {album.photos.map((entry, i) => (
                  <div key={`${photoEntryUrl(entry)}-${i}`} className="relative group aspect-square">
                    <img
                      src={photoEntryUrl(entry)}
                      alt={`Photo ${i + 1}`}
                      onClick={() => setLightboxIndex(i)}
                      className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 motion-safe:transition-opacity hover:bg-rose-600"
                          aria-label={`Delete photo ${i + 1}`}
                          title="Delete photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovingPhotoIdx(movingPhotoIdx === i ? null : i)}
                          className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 opacity-0 group-hover:opacity-100 motion-safe:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          aria-label="Move photo to another album"
                          title="Move to album"
                        >
                          <FolderInput className="w-3 h-3" />
                        </button>
                        {movingPhotoIdx === i && (
                          <div className="absolute bottom-8 right-1 z-10 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden min-w-[160px]">
                            {siblingAlbums.filter(a => a.id !== album.id).length === 0 ? (
                              <p className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">No other albums</p>
                            ) : (
                              siblingAlbums
                                .filter(a => a.id !== album.id)
                                .map(a => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => handleMovePhoto(i, a.id!)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-neutral-700 dark:text-neutral-200 motion-safe:transition-colors"
                                  >
                                    {a.name}
                                  </button>
                                ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {moveError && <p className="text-xs text-red-500 mt-1">{moveError}</p>}

            {/* Add photos (owner only) */}
            {isOwner && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoPicker(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-600 hover:border-emerald-400 dark:hover:border-emerald-500 text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Add Photos
                </button>
              </div>
            )}

            {/* Delete album (owner only) */}
            {isOwner && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                {confirmDelete ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300 flex-1">
                      Delete this album permanently?
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAlbum}
                      disabled={deleting}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Album
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && album.photos.length > 0 && (
        <ImageLightbox
          images={album.photos.map(photoEntryUrl)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Photo Picker */}
      {showPhotoPicker && (
        <PhotoPicker
          onSelect={handlePhotoPickerSelect}
          onClose={() => setShowPhotoPicker(false)}
        />
      )}
    </>
  );
}
