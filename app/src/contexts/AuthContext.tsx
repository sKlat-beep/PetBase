import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, updateProfile as updateAuthProfile } from 'firebase/auth'; // Re-added updateAuthProfile
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { DEFAULT_PROFILE, type UserProfile } from '../types/user';
import { clearCachedKey } from '../lib/crypto';
import { loadUserProfile, saveUserProfile, updateLastSeen, updateLastActive, logSignIn } from '../lib/firestoreService';

// Re-export canonical types so existing imports from this module continue to work
export type { ProfileVisibility, PublicStatus, UserProfile } from '../types/user';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

// Global hook must be accessible even if AuthProvider is not yet active (or for static types)
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      // Cleanup any existing profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Record last-seen and last-active timestamps on login
        updateLastSeen(firebaseUser.uid).catch(() => {});
        updateLastActive(firebaseUser.uid).catch(() => {});

        // Log sign-in activity
        logSignIn(firebaseUser.uid, {
          timestamp: Date.now(),
          provider: firebaseUser.providerData[0]?.providerId ?? 'unknown',
          userAgent: navigator.userAgent.substring(0, 100),
        }).catch(() => {});

        // 1. Initial Load: Try cache/Firestore for fast first render
        try {
          const p = await loadUserProfile(firebaseUser.uid);

          // 30-day inactivity session timeout — use lastActive; fall back to
          // lastSeen for accounts created before lastActive was introduced.
          const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
          const lastActive = p?.lastActive ?? p?.lastSeen ?? 0;
          if (lastActive > 0 && Date.now() - lastActive > THIRTY_DAYS) {
            await auth.signOut();
            window.location.replace('/auth?reason=session_expired');
            return;
          }

          setProfile(p || { ...DEFAULT_PROFILE });
        } catch (err) {
          console.error('Failed to load initial profile:', err);
          setProfile({ ...DEFAULT_PROFILE });
        }

        // 2. Real-time Sync: Ensure UI (navbar, etc.) stays current
        const profileRef = doc(db, 'users', firebaseUser.uid, 'profile', 'data');
        unsubscribeProfile = onSnapshot(profileRef, async (snapshot) => {
          if (snapshot.exists()) {
            const updated = await loadUserProfile(firebaseUser.uid);
            if (updated) {
              setProfile(updated);
              localStorage.setItem(`petbase_profile_${firebaseUser.uid}`, JSON.stringify(updated));
            }
          }
        }, (err) => {
          console.error('Profile sync error:', err);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const merged = { ...profile, ...updates };
    setProfile(merged); // optimistic update — nav bar refreshes immediately
    try {
      await saveUserProfile(user.uid, merged);
      if (updates.displayName && updates.displayName !== user.displayName) {
        await updateAuthProfile(user, { displayName: updates.displayName });
      }
    } catch (err) {
      setProfile(profile); // revert on failure
      console.error('Update profile failed:', err);
      throw err;
    }
  }, [user, profile]);

  const signOut = async () => {
    if (user) clearCachedKey(user.uid);
    return firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, updateProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
