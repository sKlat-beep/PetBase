import * as admin from 'firebase-admin';

export async function exportUserData(uid: string): Promise<{ downloadUrl: string }> {
  const db = admin.firestore();
  const storage = admin.storage();

  // Fetch user data
  const [profileSnap, petsSnap, signInLogSnap] = await Promise.all([
    db.doc(`users/${uid}/profile/data`).get(),
    db.collection(`pets`).where('ownerId', '==', uid).get(),
    db.collection(`users/${uid}/signInLog`).orderBy('timestamp', 'desc').limit(20).get(),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: profileSnap.exists ? profileSnap.data() : null,
    pets: petsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    signInLog: signInLogSnap.docs.map(d => d.data()),
    note: 'Some fields may be client-side encrypted (AES-256-GCM) and cannot be decrypted server-side.'
  };

  // Upload JSON to Storage
  const date = new Date().toISOString().slice(0, 10);
  const filename = `exports/${uid}/data-export-${date}.json`;
  const bucket = storage.bucket();
  const file = bucket.file(filename);

  await file.save(JSON.stringify(exportData, null, 2), {
    contentType: 'application/json',
  });

  // Generate signed URL (24 hours)
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });

  return { downloadUrl: signedUrl };
}
