import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Auth } from './pages/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProviders } from './providers/AppProviders';
import { VaultUnlockModal } from './components/VaultUnlockModal';
import { hasLocalKey, type VaultKeyDoc } from './lib/crypto';
import { loadVaultKey, touchLastSeen } from './lib/firestoreService';

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [vaultDoc, setVaultDoc] = useState<VaultKeyDoc | null>(null);

  // Check if this is a new device where the user has a vault key in Firestore
  // but no local decryption key — if so, prompt for sync password
  useEffect(() => {
    if (!user || hasLocalKey(user.uid)) return;
    loadVaultKey(user.uid)
      .then(doc => { if (doc) setVaultDoc(doc); })
      .catch(() => { /* no vault key, first-time user — nothing to unlock */ });
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
      {vaultDoc && (
        <VaultUnlockModal
          vaultDoc={vaultDoc}
          uid={user.uid}
          onUnlocked={() => setVaultDoc(null)}
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
