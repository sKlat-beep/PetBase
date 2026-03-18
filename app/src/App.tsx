import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Auth } from './pages/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProviders } from './providers/AppProviders';
import { hasLocalKey, unwrapVaultKey, unwrapLegacyVaultKey, wrapKeyForVault, type VaultKeyDoc } from './lib/crypto';
import { loadVaultKey, saveVaultKey, touchLastSeen } from './lib/firestoreService';

// Heavy routes are lazy-loaded to reduce the initial bundle sent to the auth page
const Pets = lazy(() => import('./pages/Pets').then(m => ({ default: m.Pets })));
const Community = lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const CommunityHub = lazy(() => import('./pages/CommunityHub'));
const GroupHub = lazy(() => import('./pages/GroupHub').then(m => ({ default: m.GroupHub })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const Cards = lazy(() => import('./pages/Cards').then(m => ({ default: m.Cards })));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const People = lazy(() => import('./pages/People').then(m => ({ default: m.People })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const SharedCardPage = lazy(() => import('./pages/SharedCardPage').then(m => ({ default: m.SharedCardPage })));

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function LegacyVaultMigrationModal({ vaultDoc, uid, onMigrated }: { vaultDoc: VaultKeyDoc; uid: string; onMigrated: () => void }) {
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const handleMigrate = async () => {
    if (!password) return;
    setWorking(true);
    setError('');
    try {
      // Unwrap with old password, then re-wrap with UID for automatic sync
      const key = await unwrapLegacyVaultKey(vaultDoc, password, uid);
      const newVaultDoc = await wrapKeyForVault(key, uid);
      await saveVaultKey(uid, newVaultDoc);
      onMigrated();
    } catch (err: any) {
      setError(err.message || 'Incorrect sync password.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-neutral-100 dark:border-neutral-700 space-y-5">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">One-Time Sync Migration</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          We've upgraded cross-device sync to be automatic. Enter your old sync password one last time to migrate your encryption key.
        </p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleMigrate()}
          placeholder="Old sync password"
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          autoFocus
        />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <button
          onClick={handleMigrate}
          disabled={!password || working}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {working ? 'Migrating…' : 'Migrate & Unlock'}
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [legacyVaultDoc, setLegacyVaultDoc] = useState<VaultKeyDoc | null>(null);

  // Auto-unwrap vault key using UID on new device sign-in
  useEffect(() => {
    if (!user || hasLocalKey(user.uid)) return;
    loadVaultKey(user.uid)
      .then(async (vDoc) => {
        if (!vDoc) return; // No vault key — first-time user
        // Try UID-based unwrap first (new method)
        try {
          await unwrapVaultKey(vDoc, user.uid);
        } catch {
          // UID unwrap failed — this is a legacy password-wrapped key
          if (vDoc.wrapMethod === 'password' || !vDoc.wrapMethod) {
            setLegacyVaultDoc(vDoc);
          }
        }
      })
      .catch(() => { /* no vault key */ });
  }, [user]);

  const lastSeenWriteRef = useRef<number>(0);

  // Touch lastSeen on mount and when tab becomes visible (max 1 write per minute)
  useEffect(() => {
    if (!user?.uid) return;
    touchLastSeen(user.uid).catch(() => {});
    lastSeenWriteRef.current = Date.now();
    const handler = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastSeenWriteRef.current > 60_000) {
          touchLastSeen(user.uid).catch(() => {});
          lastSeenWriteRef.current = now;
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [user?.uid]);

  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <>
      {legacyVaultDoc && (
        <LegacyVaultMigrationModal
          vaultDoc={legacyVaultDoc}
          uid={user.uid}
          onMigrated={() => setLegacyVaultDoc(null)}
        />
      )}
      {children}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/cards/view/:cardId" element={<Suspense fallback={<PageSpinner />}><SharedCardPage /></Suspense>} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="pets" element={<Suspense fallback={<PageSpinner />}><Pets /></Suspense>} />
              <Route path="community" element={<Suspense fallback={<PageSpinner />}><CommunityHub /></Suspense>} />
              <Route path="community/:groupId" element={<Suspense fallback={<PageSpinner />}><GroupHub /></Suspense>} />
              <Route path="search" element={<Suspense fallback={<PageSpinner />}><Search /></Suspense>} />
              <Route path="cards" element={<Suspense fallback={<PageSpinner />}><Cards /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageSpinner />}><ProfileSettings /></Suspense>} />
              <Route path="people" element={<Suspense fallback={<PageSpinner />}><People /></Suspense>} />
              <Route path="messages" element={<Suspense fallback={<PageSpinner />}><Messages /></Suspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}
