import { useState, useEffect } from 'react';
import {
  subscribePetAlbums,
  createPetAlbum,
  photoEntryUrl,
  type PetAlbum,
} from '../../lib/firestoreService';
import { AlbumDetailModal } from './AlbumDetailModal';

interface PhotoAlbumsProps {
  petId: string;
  ownerUid: string;
  isOwner: boolean;
  petVisibility: 'public' | 'friends' | 'private';
}

export function PhotoAlbums({ petId, ownerUid, isOwner, petVisibility }: PhotoAlbumsProps) {
  const [albums, setAlbums] = useState<PetAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // New album creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [creating, setCreating] = useState(false);

  // Selected album for detail modal
  const [selectedAlbum, setSelectedAlbum] = useState<PetAlbum | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const unsub = subscribePetAlbums(
      ownerUid,
      petId,
      (data) => {
        setAlbums(data);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [ownerUid, petId]);

  const handleCreate = async () => {
    if (!newAlbumName.trim() || creating) return;
    setCreating(true);
    try {
      await createPetAlbum(ownerUid, petId, {
        name: newAlbumName.trim(),
        photos: [],
        visibility: petVisibility,
        createdAt: Date.now(),
      });
      setNewAlbumName('');
      setIsCreating(false);
    } finally {
      setCreating(false);
    }
  };

  const handleAlbumUpdate = (updatedAlbum: PetAlbum) => {
    setAlbums(prev => prev.map(a => (a.id === updatedAlbum.id ? updatedAlbum : a)));
    setSelectedAlbum(updatedAlbum);
  };

  const handleAlbumDeleted = (albumId: string) => {
    setAlbums(prev => prev.filter(a => a.id !== albumId));
    setSelectedAlbum(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="material-symbols-outlined text-xl animate-spin text-on-surface-variant">progress_activity</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-error py-4">Failed to load albums.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">
          Albums
          {albums.length > 0 && (
            <span className="ml-2 text-xs font-normal text-on-surface-variant">({albums.length})</span>
          )}
        </h3>
        {isOwner && !isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            New Album
          </button>
        )}
      </div>

      {/* Inline new album form */}
      {isCreating && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newAlbumName}
            onChange={e => setNewAlbumName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setIsCreating(false); setNewAlbumName(''); }
            }}
            placeholder="Album name..."
            autoFocus
            className="flex-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newAlbumName.trim() || creating}
            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary text-xs font-semibold transition-colors"
          >
            {creating ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => { setIsCreating(false); setNewAlbumName(''); }}
            className="px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant text-xs font-medium hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Empty state */}
      {albums.length === 0 && !isCreating && (
        <div className="text-center py-8 space-y-2">
          <span className="material-symbols-outlined text-3xl text-outline mx-auto block">photo_library</span>
          <p className="text-sm text-on-surface-variant">No albums yet.</p>
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="text-sm text-primary hover:underline"
            >
              Create your first album
            </button>
          )}
        </div>
      )}

      {/* Album grid */}
      {albums.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {albums.map(album => (
            <AlbumCard
              key={album.id}
              album={album}
              onClick={() => setSelectedAlbum(album)}
            />
          ))}
        </div>
      )}

      {/* Album detail modal */}
      {selectedAlbum && (
        <AlbumDetailModal
          album={selectedAlbum}
          ownerUid={ownerUid}
          petId={petId}
          isOwner={isOwner}
          onClose={() => setSelectedAlbum(null)}
          onAlbumUpdate={handleAlbumUpdate}
          onAlbumDeleted={handleAlbumDeleted}
        />
      )}
    </div>
  );
}

// ─── Album Card ──────────────────────────────────────────────────────────────

function AlbumCard({ album, onClick }: { album: PetAlbum; onClick: () => void }) {
  const cover = album.coverPhoto ?? (album.photos[0] ? photoEntryUrl(album.photos[0]) : undefined);
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl overflow-hidden border border-outline-variant aspect-square relative cursor-pointer hover:ring-2 hover:ring-primary transition-shadow"
    >
      {cover ? (
        <img
          src={cover}
          alt={album.name}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-outline">photo_library</span>
        </div>
      )}
      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6">
        <p className="text-white text-xs font-semibold truncate leading-tight">{album.name}</p>
        <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs text-white font-medium">{album.photos.length} photo{album.photos.length !== 1 ? 's' : ''}</span>
      </div>
    </button>
  );
}
