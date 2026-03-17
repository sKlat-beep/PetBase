import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

// ─── Compression ──────────────────────────────────────────────────────────────
// Resizes to maxDim on the longest side and compresses to ~85% JPEG quality.
// Profile photos use a tighter cap (600px) since they're displayed small.
// Album/message photos use 1920px to preserve detail while capping filesize.

function compressImage(file: File, maxDim: number, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

// ─── Internal upload helpers ──────────────────────────────────────────────────

async function uploadDataUrl(storagePath: string, dataUrl: string, contentType?: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const storageRef = ref(storage, storagePath);
  const metadata = contentType ? { contentType } : { contentType: blob.type || 'image/jpeg' };
  await uploadBytes(storageRef, blob, metadata);
  return getDownloadURL(storageRef);
}

async function uploadBlob(storagePath: string, blob: Blob): Promise<string> {
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: blob.type });
  return getDownloadURL(storageRef);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function uploadPetProfilePhoto(uid: string, petId: string, dataUrl: string): Promise<string> {
  const ext = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
  return uploadDataUrl(`pets/${uid}/${petId}/profile.${ext}`, dataUrl);
}

export async function uploadAvatar(uid: string, dataUrl: string): Promise<string> {
  const ext = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
  return uploadDataUrl(`avatars/${uid}/avatar.${ext}`, dataUrl);
}

export async function uploadAlbumPhoto(uid: string, petId: string, albumId: string, file: File): Promise<string> {
  const compressed = await compressImage(file, 1920);
  const filename = `${Date.now()}.jpg`;
  return uploadBlob(`pets/${uid}/${petId}/albums/${albumId}/${filename}`, compressed);
}

export async function uploadUserDefaultPhoto(uid: string, file: File): Promise<string> {
  const compressed = await compressImage(file, 1920);
  const filename = `${Date.now()}.jpg`;
  return uploadBlob(`users/${uid}/default-album/${filename}`, compressed);
}

export async function uploadMessagePhoto(uid: string, file: File): Promise<string> {
  const compressed = await compressImage(file, 1920);
  const filename = `${Date.now()}.jpg`;
  return uploadBlob(`messages/${uid}/${filename}`, compressed);
}

export async function uploadMessageAudio(senderUid: string, recipientUid: string, blob: Blob): Promise<string> {
  const filename = `${Date.now()}.webm`;
  return uploadBlob(`messages/${senderUid}/audio/${filename}`, blob);
}

export async function uploadGroupBanner(
  groupId: string,
  uid: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const timestamp = Date.now();
  const storageRef = ref(storage, `groups/covers/${uid}/${timestamp}_${file.name}`);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
    task.on(
      'state_changed',
      (snap) => onProgress?.(snap.bytesTransferred / snap.totalBytes * 100),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      },
    );
  });
}

export async function uploadGroupPostImage(groupId: string, postId: string, file: File): Promise<string> {
  const compressed = await compressImage(file, 1920);
  const filename = `${Date.now()}.jpg`;
  return uploadBlob(`groups/${groupId}/posts/${postId}/${filename}`, compressed);
}

export async function deleteStorageFile(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch {
    // File may already be deleted; ignore errors
  }
}
