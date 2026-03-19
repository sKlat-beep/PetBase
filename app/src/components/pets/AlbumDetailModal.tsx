import { useState, useEffect, useCallback } from 'react';
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
  public: 'bg-primary-container text-on-primary-container',
  friends: 'bg-secondary-container text-on-secondary-container',
  private: 'bg-surface-container text-on-surface-variant',
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
        <div role="dialog" aria-modal="true" aria-labelledby="album-detail-modal-title" className="relative bg-surface-container-low rounded-2xl shadow-2xl border border-outline-variant w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-outline-variant shrink-0 gap-3">
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
                    className="flex-1 px-2 py-1 rounded-lg border border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    disabled={savingName}
                    className="p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary transition-colors"
                    aria-label="Save album name"
                    title="Save album name"
                  >
                    {savingName ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">check</span>}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 id="album-detail-modal-title" className="text-base font-semibold text-on-surface truncate">
                    {album.name}
                  </h2>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
                      aria-label="Rename album"
                      title="Rename album"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VISIBILITY_COLORS[album.visibility]}`}>
                  {VISIBILITY_LABELS[album.visibility]}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {album.photos.length} photo{album.photos.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
              aria-label="Close"
              title="Close"
            >
              <span className="material-symbols-outlined text-base">close</span>
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
                        ? 'bg-primary text-on-primary border-primary'
                        : 'border-outline-variant text-on-surface-variant hover:border-primary'
                    }`}
                  >
                    {VISIBILITY_LABELS[v]}
                  </button>
                ))}
              </div>
            )}

            {/* Photo grid */}
            {album.photos.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant text-sm">
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
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 motion-safe:transition-opacity hover:bg-error"
                          aria-label={`Delete photo ${i + 1}`}
                          title="Delete photo"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovingPhotoIdx(movingPhotoIdx === i ? null : i)}
                          className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 opacity-0 group-hover:opacity-100 motion-safe:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          aria-label="Move photo to another album"
                          title="Move to album"
                        >
                          <span className="material-symbols-outlined text-xs">drive_file_move</span>
                        </button>
                        {movingPhotoIdx === i && (
                          <div className="absolute bottom-8 right-1 z-10 bg-surface-container-low rounded-xl shadow-lg border border-outline-variant overflow-hidden min-w-[160px]">
                            {siblingAlbums.filter(a => a.id !== album.id).length === 0 ? (
                              <p className="px-3 py-2 text-xs text-on-surface-variant">No other albums</p>
                            ) : (
                              siblingAlbums
                                .filter(a => a.id !== album.id)
                                .map(a => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => handleMovePhoto(i, a.id!)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-primary-container text-on-surface motion-safe:transition-colors"
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

            {moveError && <p className="text-xs text-error mt-1">{moveError}</p>}

            {/* Add photos (owner only) */}
            {isOwner && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoPicker(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-base">upload</span>
                  Add Photos
                </button>
              </div>
            )}

            {/* Delete album (owner only) */}
            {isOwner && (
              <div className="pt-2 border-t border-outline-variant">
                {confirmDelete ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-on-surface-variant flex-1">
                      Delete this album permanently?
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAlbum}
                      disabled={deleting}
                      className="px-3 py-1.5 rounded-lg bg-error hover:bg-error/90 text-on-error text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {deleting ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : 'Delete'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
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
