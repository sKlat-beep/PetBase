import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { HouseholdRole, MemberPermissions, ParentalControls } from '../types/household';
import { DEFAULT_PERMISSIONS, DEFAULT_PARENTAL_CONTROLS, EXTENDED_FAMILY_PERMISSIONS, ROLE_DESCRIPTIONS } from '../types/household';
import { updateProfile, deleteUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { loadUserProfile, loadGamificationPrefs, getSignInLog, type SignInLogEntry, updateGamificationPrefs } from '../lib/firestoreService';
import { useGamification } from '../hooks/useGamification';
import { DEFAULT_GAMIFICATION_PREFS, type GamificationPrefs } from '../types/user';
import { useHousehold } from '../contexts/HouseholdContext';
import { ImageCropperModal, getCroppedImg } from '../components/ImageCropperModal';
import { hasLocalKey, createEncryptedBackup, restoreEncryptedBackup, wrapKeyForVault, getOrCreateUserKey, type EncryptedBackup } from '../lib/crypto';
import { saveVaultKey, loadVaultKey } from '../lib/firestoreService';
import { getActivityLog, formatRelativeTime, type ActivityEntry } from '../utils/activityLog';
import { uploadAvatar } from '../lib/storageService';
import { FeedbackModal } from '../components/FeedbackModal';
import type { EmergencyContacts } from '../types/pet';
import { AnimatePresence } from 'motion/react';
import { requestPushPermission, isPushSupported, getPushPermissionStatus } from '../lib/pushNotifications';
import { useSocial } from '../contexts/SocialContext';
import { fetchPublicProfileById } from '../lib/firestoreService';
import { playNotificationChime } from '../lib/notificationChime';
import { THEME_SWATCHES, THEME_META, type ThemeName } from '../theme/tokens';

function shortUA(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'Unknown browser';
}

/* ─── Reusable M3 toggle switch ────────────────────────────────────────── */
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed ${checked ? 'bg-primary-container' : 'bg-outline-variant'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-on-primary shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

/* ─── Section accordion wrapper ────────────────────────────────────────── */
function Section({ icon, title, defaultOpen, danger, children, id }: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  danger?: boolean;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <details open={defaultOpen} className={`glass-card group ${danger ? 'border border-error-container' : ''}`} id={id}>
      <summary className="flex items-center gap-3 px-6 py-5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span className={`material-symbols-outlined text-xl ${danger ? 'text-error' : 'text-primary-container'}`}>{icon}</span>
        <h2
          className={`text-lg font-semibold flex-1 ${danger ? 'text-error' : 'text-on-surface'}`}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {title}
        </h2>
        <span className="material-symbols-outlined text-on-surface-variant text-lg transition-transform group-open:rotate-180">expand_more</span>
      </summary>
      <div className="px-6 pb-6 space-y-5">
        {children}
      </div>
    </details>
  );
}

/* ─── M3-styled input ──────────────────────────────────────────────────── */
const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container text-sm transition-all';
const inputClassMono = `${inputClass} font-mono`;

export function ProfileSettings({ initialSection }: { initialSection?: string } = {}) {
  const { user, profile, updateProfile: updateContextProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const themeOptions = [
    { key: 'cinematic' as const, label: 'Cinematic Coral', colors: ['#FF6B6B', '#4ECDC4', '#7C5CFC'] },
    { key: 'emerald' as const, label: 'Botanical Emerald', colors: ['#2ECC71', '#A8E6CF', '#2ECC71'] },
    { key: 'amber' as const, label: 'Golden Amber', colors: ['#F1C40F', '#E67E22', '#F1C40F'] },
    { key: 'light' as const, label: 'Modern Gallery', colors: ['#FF6B6B', '#4ECDC4', '#7C5CFC'] },
  ];
  const { directory, unblockUser } = useSocial();
  const [blockedDisplayNames, setBlockedDisplayNames] = useState<Record<string, string>>({});

  // Resolve display names for blocked UIDs not found in the social directory
  useEffect(() => {
    const blockedUids = profile?.blockedUsers ?? [];
    const toFetch = blockedUids.filter(uid => !directory.find(p => p.uid === uid));
    if (toFetch.length === 0) return;

    let isMounted = true;
    const fetchedUids = new Set<string>(); // guard against race within this effect run

    toFetch.forEach(uid => {
      if (fetchedUids.has(uid)) return;
      fetchedUids.add(uid);
      fetchPublicProfileById(uid).then(p => {
        if (!isMounted) return;
        if (p) {
          setBlockedDisplayNames(prev => {
            if (prev[uid]) return prev; // already set, skip
            return { ...prev, [uid]: p.displayName ?? uid };
          });
        }
      }).catch(() => {}); // silently ignore fetch errors
    });

    return () => { isMounted = false; };
  }, [profile?.blockedUsers, directory]); // both deps included
  const { household, members, auditLog, loading: hhLoading, error: hhError, createHousehold, joinHousehold, leaveHousehold, kickMember, regenerateCode, updateMemberRole, updateMemberPermissions, updateParentalControls, renameHousehold, clearError: clearHhError } = useHousehold();
  const [hhName, setHhName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [hhView, setHhView] = useState<'idle' | 'create' | 'join'>('idle');
  const [codeCopied, setCodeCopied] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'kick' | 'leave' | 'regenerate' | 'roleToChild'; label: string; onConfirm: () => void } | null>(null);
  const [editingHhName, setEditingHhName] = useState(false);
  const [newHhName, setNewHhName] = useState('');
  const [showPersonalLogs, setShowPersonalLogs] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const gamification = useGamification(user?.uid ?? null);
  const [gamPrefs, setGamPrefs] = useState<GamificationPrefs>(DEFAULT_GAMIFICATION_PREFS);
  const [gamPrefsSaving, setGamPrefsSaving] = useState(false);
  const [gamPrefsSaved, setGamPrefsSaved] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [displayName, setDisplayName] = useState('');
  // Address is PII — loaded decrypted from Firestore, encrypted before each save
  const [address, setAddress] = useState('');
  const [isPrivate, setIsPrivate] = useState(true); // Private by default per system instructions
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Detect OAuth-only users (no password provider) to hide Change Password
  const isPasswordUser = user?.providerData.some(p => p.providerId === 'password') ?? false;

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // New-device encryption warning
  const [showEncryptionWarning] = useState(() => user ? !hasLocalKey(user.uid) : false);

  // Encrypted backup export/import
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupMode, setBackupMode] = useState<'export' | 'import'>('export');
  const [backupPassword, setBackupPassword] = useState('');
  const [backupConfirm, setBackupConfirm] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupWorking, setBackupWorking] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const backupFileRef = React.useRef<HTMLInputElement>(null);

  // Cross-Device Sync (E2EE Vault — automatic via UID)
  const [vaultEnabled, setVaultEnabled] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');

  // Profile-level emergency contacts (stored in localStorage, not Firestore — contains PII phone numbers)
  const [profileEmergency, setProfileEmergency] = useState<EmergencyContacts>({});
  const [emergencySaved, setEmergencySaved] = useState(false);

  // Sign-in activity log
  const [signInLog, setSignInLog] = useState<SignInLogEntry[]>([]);

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // PII Visibility Toggle (emergency contacts only — email & address are always visible)
  const [showEmergencyPII, setShowEmergencyPII] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState<'daily' | 'weekly' | 'off'>('off');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [notificationSound, setNotificationSound] = useState(() =>
    localStorage.getItem('petbase-sound') === '1'
  );

  const toggleSound = () => {
    const next = !notificationSound;
    setNotificationSound(next);
    if (next) {
      localStorage.setItem('petbase-sound', '1');
    } else {
      localStorage.removeItem('petbase-sound');
    }
  };

  // Privacy settings (DMs / group invites / active status)
  const [disableDMs, setDisableDMs] = useState(false);
  const [disableGroupInvites, setDisableGroupInvites] = useState(false);
  const [showLastActive, setShowLastActive] = useState(true); // default: show active status

  // Live-save infrastructure for notification + privacy toggles
  const [liveSaveError, setLiveSaveError] = useState('');
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const privacyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNotifRef = useRef({ emailNotifications: false, emailDigestFrequency: 'off' as 'daily' | 'weekly' | 'off', pushNotifications: false });
  const prevPrivacyRef = useRef({ isPrivate: true, disableDMs: false, disableGroupInvites: false, showLastActive: true });

  // Data export (GDPR)
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  // Load profile from Firestore on mount — address arrives already decrypted
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    // Initialise push permission status from browser
    setPushStatus(getPushPermissionStatus());
    Promise.all([loadUserProfile(user.uid), loadGamificationPrefs(user.uid)])
      .then(([profile, gamPrefsLoaded]) => {
        if (profile) {
          setDisplayName(profile.displayName || user.displayName || '');
          setAddress(profile.address || '');
          setIsPrivate(profile.visibility === 'Private');
          if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
          // Notification prefs
          const loadedEmailNotif = profile.emailNotifications ?? false;
          const loadedEmailFreq = profile.emailDigestFrequency ?? 'off';
          const loadedPushNotif = profile.pushNotifications ?? false;
          setEmailNotifications(loadedEmailNotif);
          setEmailDigestFrequency(loadedEmailFreq);
          setPushNotificationsEnabled(loadedPushNotif);
          prevNotifRef.current = { emailNotifications: loadedEmailNotif, emailDigestFrequency: loadedEmailFreq, pushNotifications: loadedPushNotif };
          // Privacy prefs
          const loadedDisableDMs = profile.disableDMs ?? false;
          const loadedDisableGroupInvites = profile.disableGroupInvites ?? false;
          const loadedShowLastActive = profile.showLastActive !== false;
          const loadedIsPrivate = profile.visibility === 'Private';
          setDisableDMs(loadedDisableDMs);
          setDisableGroupInvites(loadedDisableGroupInvites);
          setShowLastActive(loadedShowLastActive);
          prevPrivacyRef.current = { isPrivate: loadedIsPrivate, disableDMs: loadedDisableDMs, disableGroupInvites: loadedDisableGroupInvites, showLastActive: loadedShowLastActive };
        }
        // Gamification prefs from private config subcollection (TASK-223)
        setGamPrefs(gamPrefsLoaded);
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
    // Fetch sign-in activity log
    getSignInLog(user.uid).then(setSignInLog).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) { setActivityLog([]); return; }
    getActivityLog(user.uid).then(setActivityLog).catch(() => setActivityLog([]));
    const stored = localStorage.getItem(`petbase-profile-emergency-${user.uid}`);
    if (stored) { try { setProfileEmergency(JSON.parse(stored)); } catch { /* ignore corrupt */ } }
    // Check vault sync status
    loadVaultKey(user.uid).then(doc => setVaultEnabled(!!doc)).catch(() => { });
  }, [user]);

  // Auto-open and scroll to a section when opened from the onboarding checklist
  useEffect(() => {
    if (!initialSection) return;
    const el = document.getElementById(initialSection) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [initialSection]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      // Update Firebase Auth display name
      await updateProfile(user, { displayName });
      // Save to Firestore via AuthContext — triggers optimistic nav bar update
      await updateContextProfile({
        displayName,
        address,
        avatarUrl,
        visibility: isPrivate ? 'Private' : 'Public',
      });
      setSaveSuccess(true);
      setIsDirty(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteEmailInput !== user.email) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteUser(user);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError(
          'For security, please sign out and sign back in before deleting your account.'
        );
      } else {
        setDeleteError(err.message || 'Failed to delete account.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEmergencyContacts = () => {
    if (!user) return;
    localStorage.setItem(`petbase-profile-emergency-${user.uid}`, JSON.stringify(profileEmergency));
    setEmergencySaved(true);
    setTimeout(() => setEmergencySaved(false), 2500);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteEmailInput('');
    setDeleteError('');
  };

  const handleSaveGamificationPrefs = async (prefs: GamificationPrefs) => {
    if (!user) return;
    setGamPrefsSaving(true);
    try {
      await updateGamificationPrefs(user.uid, prefs, gamification.state?.level ?? 1);
      setGamPrefs(prefs);
      setGamPrefsSaved(true);
      setTimeout(() => setGamPrefsSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save gamification prefs', err);
    } finally {
      setGamPrefsSaving(false);
    }
  };

  const handleEnableSync = async () => {
    if (!user) return;
    setSyncSaving(true);
    setSyncError('');
    setSyncSuccess('');
    try {
      const key = await getOrCreateUserKey(user.uid);
      const vaultDoc = await wrapKeyForVault(key, user.uid);
      await saveVaultKey(user.uid, vaultDoc);
      setVaultEnabled(true);
      setSyncSuccess('Cross-device sync enabled! Sign in on any device to automatically access your encrypted data.');
    } catch (err: any) {
      setSyncError(err.message || 'Failed to enable sync.');
    } finally {
      setSyncSaving(false);
    }
  };


  // ── Notifications live-save (400 ms debounce) ────────────────────────────
  const liveNotifSave = (values: { emailNotifications: boolean; emailDigestFrequency: 'daily' | 'weekly' | 'off'; pushNotifications: boolean }) => {
    if (!user) return;
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(async () => {
      try {
        await updateContextProfile({
          emailNotifications: values.emailNotifications,
          emailDigestFrequency: values.emailNotifications ? values.emailDigestFrequency : 'off',
          pushNotifications: values.pushNotifications,
        });
        prevNotifRef.current = values;
      } catch {
        // Rollback toggles to last successfully saved values
        setEmailNotifications(prevNotifRef.current.emailNotifications);
        setEmailDigestFrequency(prevNotifRef.current.emailDigestFrequency);
        setPushNotificationsEnabled(prevNotifRef.current.pushNotifications);
        setLiveSaveError('Settings could not be saved. Please try again.');
        setTimeout(() => setLiveSaveError(''), 3000);
      }
    }, 400);
  };

  // ── Push toggle handler ──────────────────────────────────────────────────
  const handlePushToggle = async () => {
    if (!isPushSupported()) return;
    let newPush = pushNotificationsEnabled;
    if (!pushNotificationsEnabled) {
      // Turning ON — request permission + get FCM token (async — must resolve before saving)
      const token = await requestPushPermission(user!.uid);
      const newStatus = getPushPermissionStatus();
      setPushStatus(newStatus);
      if (token && newStatus === 'granted') {
        setPushNotificationsEnabled(true);
        newPush = true;
      }
    } else {
      // Turning OFF — just update profile preference; can't programmatically revoke permission
      setPushNotificationsEnabled(false);
      newPush = false;
    }
    liveNotifSave({ emailNotifications, emailDigestFrequency, pushNotifications: newPush });
  };

  // ── Privacy live-save (400 ms debounce) ──────────────────────────────────
  const livePrivacySave = (values: { isPrivate: boolean; disableDMs: boolean; disableGroupInvites: boolean; showLastActive: boolean }) => {
    if (!user) return;
    if (privacyTimerRef.current) clearTimeout(privacyTimerRef.current);
    privacyTimerRef.current = setTimeout(async () => {
      try {
        await updateContextProfile({
          visibility: values.isPrivate ? 'Private' : 'Public',
          disableDMs: values.disableDMs,
          disableGroupInvites: values.disableGroupInvites,
          showLastActive: values.showLastActive,
        });
        prevPrivacyRef.current = values;
      } catch {
        // Rollback
        setIsPrivate(prevPrivacyRef.current.isPrivate);
        setDisableDMs(prevPrivacyRef.current.disableDMs);
        setDisableGroupInvites(prevPrivacyRef.current.disableGroupInvites);
        setShowLastActive(prevPrivacyRef.current.showLastActive);
        setLiveSaveError('Settings could not be saved. Please try again.');
        setTimeout(() => setLiveSaveError(''), 3000);
      }
    }, 400);
  };

  const handleExport = async () => {
    setExporting(true);
    setExportUrl(null);
    try {
      const exportFn = httpsCallable(functions, 'exportUserData');
      const result = await exportFn({});
      setExportUrl((result.data as any).downloadUrl);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user || !backupPassword) return;
    if (backupPassword !== backupConfirm) { setBackupError('Passwords do not match.'); return; }
    if (backupPassword.length < 8) { setBackupError('Backup password must be at least 8 characters.'); return; }
    setBackupWorking(true);
    setBackupError('');
    try {
      const backup = await createEncryptedBackup(user.uid, backupPassword);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petbase-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupSuccess('Backup downloaded. Keep this file and your backup password safe.');
      setBackupPassword('');
      setBackupConfirm('');
    } catch (err: any) {
      setBackupError(err.message || 'Failed to create backup.');
    } finally {
      setBackupWorking(false);
    }
  };

  const handleImportBackup = async () => {
    if (!backupFile || !backupPassword) return;
    setBackupWorking(true);
    setBackupError('');
    try {
      const text = await backupFile.text();
      const backup: EncryptedBackup = JSON.parse(text);
      await restoreEncryptedBackup(backup, backupPassword);
      setBackupSuccess('Backup restored successfully. Your encrypted data is now accessible on this device.');
      setBackupPassword('');
      setBackupFile(null);
    } catch (err: any) {
      setBackupError(err.message || 'Failed to restore backup. Check your password and file.');
    } finally {
      setBackupWorking(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-primary-container/30 border-t-primary-container animate-spin" />
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImage(reader.result?.toString() || '');
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset
    }
  };

  const handleCropComplete = async (croppedAreaPixels: any) => {
    try {
      const croppedImageBlobUrl = await getCroppedImg(selectedImage, croppedAreaPixels);
      const uid = user?.uid;
      if (!uid) { setShowCropper(false); return; }
      const storageUrl = await uploadAvatar(uid, croppedImageBlobUrl);
      URL.revokeObjectURL(croppedImageBlobUrl);
      setAvatarUrl(storageUrl);
      setIsDirty(true);
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      setShowCropper(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-2xl"
    >
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-on-surface tracking-tight"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            Profile &amp; Settings
          </h1>
          <p className="text-on-surface-variant mt-1">
            Manage your account information and privacy preferences.
          </p>
        </div>
        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high text-sm font-medium transition-colors motion-safe:active:scale-[0.97] self-start shrink-0"
        >
          <span className="material-symbols-outlined text-lg">chat_bubble</span>
          Feedback / Report Issue
        </button>
      </header>

      {/* New-device encryption warning */}
      {showEncryptionWarning && (
        <div className="flex items-start gap-4 p-4 bg-error-container/40 border border-error-container rounded-2xl">
          <span className="material-symbols-outlined text-error shrink-0 mt-0.5">vpn_key</span>
          <div className="flex-1">
            <p className="font-semibold text-on-surface">New device detected</p>
            <p className="text-sm text-on-surface-variant mt-1">
              Your encrypted data (medical records, expenses, pet notes) is not yet accessible on this device.
              Enable Cross-Device Sync to automatically access your data on any device you sign in to.
              Otherwise, restore from a backup file.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <a href="#section-sync" className="text-sm font-medium text-primary-container underline hover:no-underline">
                Set up sync
              </a>
              <button
                type="button"
                onClick={() => { setBackupMode('import'); setShowBackupModal(true); }}
                className="text-sm font-medium text-primary-container underline hover:no-underline"
              >
                Import backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — Profile Info
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="person" title="Profile Information" defaultOpen id="section-profile">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 bg-surface-container overflow-hidden shrink-0 rounded-full shadow-md">
                {avatarUrl || user?.photoURL ? (
                  <img
                    src={avatarUrl || user?.photoURL || ''}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-container/20 text-primary-container text-3xl font-bold">
                    {displayName?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <span className="material-symbols-outlined text-2xl">photo_camera</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
            </div>

            <div className="space-y-3 flex-1">
              <div>
                <p className="font-semibold text-lg text-on-surface">
                  {displayName || 'Pet Parent'}
                </p>
                {profile?.username && (
                  <div className="flex items-center gap-2 mt-0.5 mb-1.5">
                    <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">
                      @{profile.username.split('#')[0]}<span className="opacity-60">#{profile.username.split('#')[1]}</span>
                    </span>
                    <button type="button" onClick={() => navigator.clipboard.writeText(profile.username!)} className="text-on-surface-variant hover:text-primary-container transition-colors motion-safe:active:scale-[0.97]" title="Copy username">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                )}
                <p className="text-sm text-on-surface-variant">{user?.email}</p>
              </div>

            </div>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-on-surface-variant mb-1.5">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setIsDirty(true); }}
              className={inputClass}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">mail</span>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container border-0 text-on-surface-variant/60 cursor-not-allowed font-mono text-sm"
              />
            </div>
            <p className="text-xs text-on-surface-variant/60 mt-1.5">
              Email changes require re-authentication. Contact support to update your email.
            </p>
          </div>

          {/* Physical Address — PII field, encrypted by saveUserProfile before Firestore write */}
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-on-surface-variant mb-1.5"
            >
              Physical Address{' '}
              <span className="text-xs font-normal bg-primary-container/20 text-primary-container px-2 py-0.5 rounded-full ml-1">
                Encrypted
              </span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">location_on</span>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setIsDirty(true); }}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container text-sm transition-all font-mono"
                placeholder="123 Main St, City, State"
              />
            </div>
            <p className="text-xs text-on-surface-variant/60 mt-1.5">
              AES-256-GCM encrypted client-side before being stored. The server never sees plaintext.
            </p>
          </div>

          {saveError && (
            <p className="text-sm text-error bg-error-container/40 p-3 rounded-lg">
              {saveError}
            </p>
          )}

          {saveSuccess && (
            <p className="text-sm text-primary-container font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">check_circle</span> Changes saved
            </p>
          )}
        </form>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — Theme & Appearance
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="palette" title="Theme & Appearance" id="section-appearance">
        <div className="p-4 bg-surface-container rounded-xl">
          <h3 className="text-sm font-medium text-on-surface-variant mb-3" style={{ fontFamily: 'var(--font-headline)' }}>Theme</h3>
          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map(({ key, label, colors }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                aria-label={label}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  theme === key
                    ? 'ring-2 ring-primary-container bg-surface-container-high'
                    : 'bg-surface-container hover:bg-surface-container-high'
                }`}
              >
                <div className="flex gap-1">
                  {colors.map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <span className="text-sm font-medium text-on-surface">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2b — Badge & XP Appearance
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="military_tech" title="Badge & XP Appearance" id="section-badge-xp">
        {(() => {
          const SPIRIT_ICONS = [
            { symbol: 'pets',                    label: 'Paw' },
            { symbol: 'star',                    label: 'Star' },
            { symbol: 'bolt',                    label: 'Bolt' },
            { symbol: 'shield',                  label: 'Shield' },
            { symbol: 'emoji_events',            label: 'Trophy' },
            { symbol: 'local_florist',           label: 'Flower' },
            { symbol: 'local_fire_department',   label: 'Flame' },
            { symbol: 'favorite',               label: 'Heart' },
            { symbol: 'diamond',                label: 'Diamond' },
            { symbol: 'gps_fixed',              label: 'Target' },
          ];
          const CUSTOM_RING_COLORS = [
            { label: 'Coral',  hex: '#F28B82' },
            { label: 'Amber',  hex: '#FFA726' },
            { label: 'Teal',   hex: '#26C6DA' },
            { label: 'Violet', hex: '#7C5CFC' },
            { label: 'Sky',    hex: '#38BDF8' },
            { label: 'Rose',   hex: '#EC407A' },
            { label: 'Lime',   hex: '#A3E635' },
            { label: 'White',  hex: '#F1F5F9' },
          ];
          const pref = <K extends keyof GamificationPrefs>(key: K, val: GamificationPrefs[K]) =>
            handleSaveGamificationPrefs({ ...gamPrefs, [key]: val });
          const rowClass = 'flex items-center justify-between py-3 border-b border-outline-variant/20 last:border-0';
          const labelClass = 'text-sm font-medium text-on-surface';
          const subClass = 'text-xs text-on-surface-variant mt-0.5';
          const segClass = (active: boolean) =>
            `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors motion-safe:active:scale-[0.97] ${active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container'}`;

          return (
            <div className="space-y-1">
              {/* ── Tier Crest ── */}
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Tier Crest</p>
              <div className={rowClass}>
                <div><p className={labelClass}>Show tier crest</p><p className={subClass}>Display your rank badge below your name</p></div>
                <ToggleSwitch checked={gamPrefs.showCrest} onChange={() => pref('showCrest', !gamPrefs.showCrest)} disabled={gamPrefsSaving} />
              </div>
              {gamPrefs.showCrest && (
                <>
                  <div className={rowClass}>
                    <p className={labelClass}>Badge style</p>
                    <div className="flex gap-1 bg-surface-container rounded-xl p-1">
                      {(['minimal', 'crest', 'glow'] as const).map(s => (
                        <button key={s} className={segClass(gamPrefs.badgeStyle === s)} onClick={() => pref('badgeStyle', s)}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={rowClass}>
                    <div><p className={labelClass}>Spirit icon</p><p className={subClass}>Your personal crest symbol</p></div>
                  </div>
                  <div className="grid grid-cols-5 gap-2 pb-3">
                    {SPIRIT_ICONS.map(({ symbol, label }) => (
                      <button
                        key={symbol}
                        title={label}
                        onClick={() => pref('spiritIcon', symbol)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors motion-safe:active:scale-[0.97] ${gamPrefs.spiritIcon === symbol ? 'bg-primary-container ring-2 ring-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      >
                        <span className="material-symbols-outlined text-xl">{symbol}</span>
                        <span className="text-[10px]">{label}</span>
                      </button>
                    ))}
                  </div>
                  <div className={rowClass}>
                    <div><p className={labelClass}>Show point count</p><p className={subClass}>Display your XP total in the badge</p></div>
                    <ToggleSwitch checked={gamPrefs.showPointCount} onChange={() => pref('showPointCount', !gamPrefs.showPointCount)} disabled={gamPrefsSaving} />
                  </div>
                  <div className={rowClass}>
                    <div>
                      <p className={labelClass}>Show on public profile</p>
                      <p className={subClass}>Your spirit icon appears on your avatar for other users</p>
                    </div>
                    <ToggleSwitch checked={gamPrefs.publicCrestEnabled} onChange={() => pref('publicCrestEnabled', !gamPrefs.publicCrestEnabled)} disabled={gamPrefsSaving} />
                  </div>
                </>
              )}

              {/* ── XP Ring ── */}
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-5 mb-3">XP Ring</p>
              <div className={rowClass}>
                <div><p className={labelClass}>Show XP ring</p><p className={subClass}>Progress arc around your avatar</p></div>
                <ToggleSwitch checked={gamPrefs.showXpRing} onChange={() => pref('showXpRing', !gamPrefs.showXpRing)} disabled={gamPrefsSaving} />
              </div>
              {gamPrefs.showXpRing && (
                <>
                  <div className={rowClass}>
                    <p className={labelClass}>Ring color</p>
                    <div className="flex gap-1 bg-surface-container rounded-xl p-1">
                      {(['theme', 'tier', 'custom'] as const).map(c => (
                        <button key={c} className={segClass(gamPrefs.ringColor === c || (c === 'custom' && gamPrefs.ringColor !== 'theme' && gamPrefs.ringColor !== 'tier'))}
                          onClick={() => pref('ringColor', c === 'custom' ? CUSTOM_RING_COLORS[0].hex : c)}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {gamPrefs.ringColor !== 'theme' && gamPrefs.ringColor !== 'tier' && (
                    <div className="flex gap-2 flex-wrap pb-3">
                      {CUSTOM_RING_COLORS.map(({ label, hex }) => (
                        <button
                          key={hex}
                          title={label}
                          onClick={() => pref('ringColor', hex)}
                          className={`w-8 h-8 rounded-full transition-transform motion-safe:active:scale-[0.9] ${gamPrefs.ringColor === hex ? 'ring-2 ring-offset-2 ring-primary-container scale-110' : ''}`}
                          style={{ backgroundColor: hex }}
                          aria-label={label}
                        />
                      ))}
                    </div>
                  )}
                  <div className={rowClass}>
                    <p className={labelClass}>Ring animation</p>
                    <div className="flex gap-1 bg-surface-container rounded-xl p-1">
                      {(['static', 'pulse', 'shimmer'] as const).map(a => (
                        <button key={a} className={segClass(gamPrefs.ringAnimation === a)} onClick={() => pref('ringAnimation', a)}>
                          {a.charAt(0).toUpperCase() + a.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={rowClass}>
                    <div><p className={labelClass}>Show level number</p><p className={subClass}>Small number at the corner of your avatar</p></div>
                    <ToggleSwitch checked={gamPrefs.showLevelNumber} onChange={() => pref('showLevelNumber', !gamPrefs.showLevelNumber)} disabled={gamPrefsSaving} />
                  </div>
                </>
              )}

              {/* ── Celebrations ── */}
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-5 mb-3">Celebrations</p>
              <div className={rowClass}>
                <div><p className={labelClass}>Celebrate level-ups</p><p className={subClass}>Confetti and animation when you reach a new tier</p></div>
                <ToggleSwitch checked={gamPrefs.celebrateMilestones} onChange={() => pref('celebrateMilestones', !gamPrefs.celebrateMilestones)} disabled={gamPrefsSaving} />
              </div>

              {/* Save feedback */}
              {gamPrefsSaved && (
                <p className="flex items-center gap-2 text-sm text-primary-container pt-2">
                  <span className="material-symbols-outlined text-lg">check_circle</span> Appearance saved
                </p>
              )}
            </div>
          );
        })()}
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — Notifications
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="notifications" title="Notifications" id="section-notifications">
        {/* In-app — always on */}
        <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
          <div>
            <p className="font-medium text-on-surface">In-app notifications</p>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Always on — you'll always receive in-app notifications.
            </p>
          </div>
          <span className="text-xs font-medium bg-primary-container/20 text-primary-container px-3 py-1 rounded-full">
            Always on
          </span>
        </div>

        {/* Email notifications */}
        <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
          <div className="flex-1 min-w-0 mr-4">
            <p className="font-medium text-on-surface">Email notifications</p>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Receive email alerts for important activity.
            </p>
          </div>
          <ToggleSwitch checked={emailNotifications} onChange={() => {
            const next = !emailNotifications;
            setEmailNotifications(next);
            liveNotifSave({ emailNotifications: next, emailDigestFrequency, pushNotifications: pushNotificationsEnabled });
          }} />
        </div>

        {emailNotifications && (
          <div className="px-4 pb-2">
            <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
              Email frequency
            </label>
            <select
              value={emailDigestFrequency}
              onChange={e => {
                const next = e.target.value as 'daily' | 'weekly' | 'off';
                setEmailDigestFrequency(next);
                liveNotifSave({ emailNotifications, emailDigestFrequency: next, pushNotifications: pushNotificationsEnabled });
              }}
              className={inputClass}
            >
              <option value="off">Off (manual only)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>
        )}

        {/* Push notifications */}
        <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
          <div className="flex-1 min-w-0 mr-4">
            <p className="font-medium text-on-surface">Push notifications</p>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {pushStatus === 'unsupported'
                ? 'Not supported in this browser.'
                : pushStatus === 'denied'
                  ? 'Blocked — update permissions in your browser settings.'
                  : pushStatus === 'granted'
                    ? 'Enabled in your browser.'
                    : 'Toggling on will request browser permission.'}
            </p>
          </div>
          <ToggleSwitch
            checked={pushNotificationsEnabled}
            onChange={handlePushToggle}
            disabled={pushStatus === 'unsupported' || pushStatus === 'denied'}
          />
        </div>

        {/* Sound alerts for new messages */}
        <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-sm font-medium text-on-surface-variant">Sound alerts for new messages</p>
            <p className="text-xs text-on-surface-variant/60 mt-0.5">Play a chime when a new direct message arrives</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => playNotificationChime()}
              className="text-xs text-on-surface-variant hover:text-primary-container underline transition-colors motion-safe:active:scale-[0.97]"
            >
              Preview
            </button>
            <ToggleSwitch checked={notificationSound} onChange={toggleSound} />
          </div>
        </div>

        {liveSaveError && (
          <p className="text-sm text-error bg-error-container/30 px-3 py-2 rounded-lg">
            {liveSaveError}
          </p>
        )}
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — Privacy & Safety
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="shield" title="Privacy & Safety" id="section-privacy">
        <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
          <div>
            <p className="font-medium text-on-surface">Profile Visibility</p>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {isPrivate
                ? 'Only visible to people you share with.'
                : 'Visible to the PetBase community.'}
            </p>
          </div>
          <ToggleSwitch checked={isPrivate} onChange={() => {
            const next = !isPrivate;
            setIsPrivate(next);
            livePrivacySave({ isPrivate: next, disableDMs, disableGroupInvites, showLastActive });
          }} />
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-on-surface-variant">Current status</span>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${isPrivate
              ? 'bg-primary-container/20 text-primary-container'
              : 'bg-tertiary-container text-on-tertiary-container'
              }`}
          >
            {isPrivate ? 'Private' : 'Public'}
          </span>
        </div>

        {/* Direct messages */}
        <div className="pt-4 border-t border-outline-variant space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">person_off</span>
            Messaging &amp; Invites
          </h3>

          <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
            <div>
              <p className="font-medium text-on-surface">Disable direct messages</p>
              <p className="text-sm text-on-surface-variant mt-0.5">
                Prevent other users from sending you DMs.
              </p>
            </div>
            <ToggleSwitch checked={disableDMs} onChange={() => {
              const next = !disableDMs;
              setDisableDMs(next);
              livePrivacySave({ isPrivate, disableDMs: next, disableGroupInvites, showLastActive });
            }} />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
            <div>
              <p className="font-medium text-on-surface">Disable group invites</p>
              <p className="text-sm text-on-surface-variant mt-0.5">
                Prevent group admins from inviting you to groups.
              </p>
            </div>
            <ToggleSwitch checked={disableGroupInvites} onChange={() => {
              const next = !disableGroupInvites;
              setDisableGroupInvites(next);
              livePrivacySave({ isPrivate, disableDMs, disableGroupInvites: next, showLastActive });
            }} />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
            <div>
              <p className="font-medium text-on-surface">Show my active status</p>
              <p className="text-sm text-on-surface-variant mt-0.5">
                Let others see when you were last active in DMs.
              </p>
            </div>
            <ToggleSwitch checked={showLastActive} onChange={() => {
              const next = !showLastActive;
              setShowLastActive(next);
              livePrivacySave({ isPrivate, disableDMs, disableGroupInvites, showLastActive: next });
            }} />
          </div>

        </div>

        {/* Blocked users */}
        <div className="pt-4 border-t border-outline-variant space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">notifications_off</span>
            Blocked Users
          </h3>
          {(profile?.blockedUsers?.length ?? 0) === 0 ? (
            <p className="text-sm text-on-surface-variant p-4 bg-surface-container rounded-xl">
              You haven't blocked anyone.
            </p>
          ) : (
            <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant">
              {profile!.blockedUsers.map(blockedUid => {
                const blockedProfile = directory.find(p => p.uid === blockedUid);
                const displayName =
                  blockedProfile?.displayName ??
                  blockedDisplayNames[blockedUid] ??
                  `User ${blockedUid.slice(0, 8)}`;
                const initials = displayName
                  .split(' ')
                  .slice(0, 2)
                  .map(w => w[0]?.toUpperCase() ?? '')
                  .join('');
                return (
                  <div key={blockedUid} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-on-surface-variant">
                        {initials || '?'}
                      </span>
                    </div>
                    <span className="text-sm text-on-surface-variant truncate flex-1">{displayName}</span>
                    <button
                      type="button"
                      onClick={() => unblockUser(blockedUid)}
                      className="text-xs font-medium text-error hover:opacity-80 shrink-0"
                    >
                      Unblock
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security sub-section */}
        <div className="pt-4 border-t border-outline-variant space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">lock</span>
            Security
          </h3>
          {isPasswordUser && (
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">lock</span>
                <div className="text-left">
                  <p className="font-medium text-on-surface">Change Password</p>
                  <p className="text-xs text-on-surface-variant">
                    Update your account password
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
            </button>
          )}
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">smartphone</span>
              <div className="text-left">
                <p className="font-medium text-on-surface">
                  Two-Factor Authentication
                </p>
                <p className="text-xs text-on-surface-variant">
                  Add an extra layer of security
                </p>
              </div>
            </div>
            <span className="text-xs font-medium bg-surface-container-high text-on-surface-variant px-2 py-1 rounded-md">
              Coming Soon
            </span>
          </button>

          {/* Recent Sign-ins */}
          {signInLog.length > 0 && (
            <div className="pt-2">
              <p className="text-sm font-medium text-on-surface-variant flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-lg">history</span>
                Recent Sign-ins
              </p>
              <ul className="space-y-2">
                {signInLog.map((entry, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-container text-xs"
                  >
                    <span className="text-on-surface-variant truncate max-w-[200px]" title={entry.userAgent}>
                      {shortUA(entry.userAgent)}
                    </span>
                    <span className="text-on-surface-variant/60 shrink-0 ml-2">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5 — Encryption & Sync
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="sync_lock" title="Encryption & Sync" id="section-sync">
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">Cross-Device Sync</p>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${vaultEnabled ? 'bg-primary-container/20 text-primary-container' : 'bg-surface-container text-on-surface-variant'}`}>
            {vaultEnabled ? 'Enabled' : 'Not enabled'}
          </span>
        </div>

        <p className="text-sm text-on-surface-variant leading-relaxed">
          Enable automatic cross-device sync to securely store your encryption key in the cloud.
          Your encrypted data (medical records, expenses, notes) will be accessible on any device
          you sign in to — no extra passwords needed. The server only ever stores encrypted ciphertext.
        </p>

        {vaultEnabled && (
          <div className="flex items-center gap-3 p-3 bg-primary-container/10 border border-primary-container/30 rounded-xl">
            <span className="material-symbols-outlined text-primary-container shrink-0">check_circle</span>
            <p className="text-sm text-on-surface-variant">
              Sync is active. Sign in on any device to automatically access your encrypted data.
            </p>
          </div>
        )}

        {syncError && (
          <p className="text-sm text-error bg-error-container/40 px-3 py-2 rounded-lg">
            {syncError}
          </p>
        )}
        {syncSuccess && (
          <p className="text-sm text-primary-container bg-primary-container/10 px-3 py-2 rounded-lg">
            {syncSuccess}
          </p>
        )}

        {!vaultEnabled && (
          <button
            onClick={handleEnableSync}
            disabled={syncSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-tertiary-container text-on-tertiary-container hover:opacity-90 disabled:opacity-50 font-medium transition-all motion-safe:active:scale-[0.97]"
          >
            {syncSaving && <span className="material-symbols-outlined text-lg animate-spin">sync</span>}
            {syncSaving ? 'Enabling...' : 'Enable Cross-Device Sync'}
          </button>
        )}
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 6 — Data & Backup
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="cloud_download" title="Data & Backup" id="section-data">
        {/* Encrypted Backup */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
            <span className="material-symbols-outlined text-lg">vpn_key</span>
            Encrypted Backup
          </h3>
          <p className="text-sm text-on-surface-variant">
            Export an encrypted backup for offline recovery. The backup file is protected by a password you choose.
            If you have Cross-Device Sync enabled, your data is also accessible automatically on any signed-in device.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => { setBackupMode('export'); setShowBackupModal(true); setBackupError(''); setBackupSuccess(''); }}
              className="flex items-center gap-2 bg-primary-container hover:opacity-90 text-on-primary-container px-4 py-2 rounded-xl font-medium transition-all motion-safe:active:scale-[0.97]"
            >
              <span className="material-symbols-outlined text-lg">download</span> Export Backup
            </button>
            <button
              type="button"
              onClick={() => { setBackupMode('import'); setShowBackupModal(true); setBackupError(''); setBackupSuccess(''); }}
              className="flex items-center gap-2 border border-outline-variant hover:bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-xl font-medium transition-colors motion-safe:active:scale-[0.97]"
            >
              <span className="material-symbols-outlined text-lg">upload</span> Import Backup
            </button>
          </div>
        </div>

        {/* Export Your Data (GDPR) */}
        <div className="pt-4 border-t border-outline-variant space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
            <span className="material-symbols-outlined text-lg">file_download</span>
            Export Your Data
          </h3>
          <p className="text-xs text-on-surface-variant">
            Download a copy of all your PetBase data as a JSON file. Link expires in 24 hours.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-surface-container text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50 flex items-center gap-2 motion-safe:active:scale-[0.97]"
          >
            {exporting
              ? <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              : <span className="material-symbols-outlined text-lg">download</span>}
            {exporting ? 'Preparing export...' : 'Export My Data'}
          </button>
          {exportUrl && (
            <a
              href={exportUrl}
              download
              className="mt-2 block text-sm text-primary-container underline"
            >
              Download ready — click to save
            </a>
          )}
        </div>

        {/* Personal Activity Log */}
        <div className="pt-4 border-t border-outline-variant space-y-3">
          <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
            <span className="material-symbols-outlined text-lg">monitoring</span>
            Personal Activity Log
          </h3>
          <p className="text-sm text-on-surface-variant">
            A rolling 60-day log of your key actions in PetBase. Stored locally on this device only.
          </p>

          <button
            onClick={() => {
              setShowPersonalLogs(v => !v);
              if (!showPersonalLogs && user) getActivityLog(user.uid).then(setActivityLog).catch(() => {});
            }}
            className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary-container transition-colors motion-safe:active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-lg">schedule</span>
            My Activity
            {activityLog.length > 0 && (
              <span className="text-xs bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded-full">{activityLog.length}</span>
            )}
            <span className={`material-symbols-outlined text-lg ml-auto transition-transform ${showPersonalLogs ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {showPersonalLogs && (
            <div className="rounded-xl border border-outline-variant overflow-hidden">
              {activityLog.length === 0 ? (
                <p className="text-sm text-on-surface-variant p-4">No activity logged yet.</p>
              ) : (
                <div className="divide-y divide-outline-variant max-h-80 overflow-y-auto">
                  {activityLog.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-on-surface-variant">{entry.action}</span>
                      <span className="text-on-surface-variant/60 text-xs whitespace-nowrap ml-4">{formatRelativeTime(entry.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Family Audit Log (visible to all household members) */}
          {household && members.find(m => m.uid === user?.uid) && (
            <>
              <button
                onClick={() => setShowAuditLog(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary-container transition-colors motion-safe:active:scale-[0.97]"
              >
                <span className="material-symbols-outlined text-lg">history</span>
                Family Audit Log
                {auditLog.length > 0 && <span className="text-xs bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded-full">{auditLog.length}</span>}
                <span className={`material-symbols-outlined text-lg ml-auto transition-transform ${showAuditLog ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {showAuditLog && (
                <div className="rounded-xl border border-outline-variant overflow-hidden">
                  {auditLog.length === 0 ? (
                    <p className="text-sm text-on-surface-variant p-4">No audit entries yet.</p>
                  ) : (
                    <div className="divide-y divide-outline-variant max-h-80 overflow-y-auto">
                      {auditLog.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <div>
                            <span className="font-medium text-on-surface-variant">{entry.actorName}</span>
                            <span className="text-on-surface-variant/60 ml-1">— {entry.action}</span>
                          </div>
                          <span className="text-on-surface-variant/60 text-xs whitespace-nowrap ml-4">{formatRelativeTime(entry.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Family Sharing */}
        <div className="pt-4 border-t border-outline-variant space-y-5" id="section-family">
          <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
            <span className="material-symbols-outlined text-lg text-tertiary">group</span>
            Family Sharing
          </h3>
          <p className="text-sm text-on-surface-variant">
            Create or join a household to share pet co-management access with family members.
          </p>

          {hhError && (
            <div className="flex items-center gap-3 p-3 bg-error-container/40 border border-error-container rounded-xl text-sm text-error">
              <span className="material-symbols-outlined text-lg shrink-0">warning</span> {hhError}
              <button onClick={clearHhError} className="ml-auto text-error/60 hover:text-error" aria-label="Dismiss error"><span className="material-symbols-outlined text-lg">close</span></button>
            </div>
          )}

          {hhLoading && !household ? (
            <div className="flex items-center justify-center py-8 gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              <span className="text-sm">Loading household...</span>
            </div>
          ) : household ? (
            <>
              {/* Current household */}
              <div className="bg-tertiary-container/30 border border-tertiary-container rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    {editingHhName ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={newHhName} onChange={e => setNewHhName(e.target.value)} autoFocus className="px-2 py-1 rounded-lg bg-surface-container text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary w-48" />
                        <button onClick={() => { if (newHhName.trim()) renameHousehold(newHhName.trim()).then(() => setEditingHhName(false)); }} className="p-1 text-primary-container hover:opacity-80" title="Save"><span className="material-symbols-outlined text-lg">check</span></button>
                        <button onClick={() => setEditingHhName(false)} className="p-1 text-on-surface-variant hover:text-on-surface" title="Cancel"><span className="material-symbols-outlined text-lg">close</span></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-on-surface">{household.name}</p>
                        {household.ownerId === user?.uid && (
                          <button onClick={() => { setNewHhName(household.name); setEditingHhName(true); }} className="p-1 text-on-surface-variant hover:text-tertiary" title="Rename household"><span className="material-symbols-outlined text-sm">edit</span></button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {members.find(m => m.uid === user?.uid)?.role ?? (household.ownerId === user?.uid ? 'Family Leader' : 'Member')}
                    </p>
                  </div>
                  <span className="text-xs bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded-full font-medium">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Invite code — owner only */}
                {household.ownerId === user?.uid && (
                  <div className="bg-surface-container rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-on-surface-variant mb-0.5">Invite Code</p>
                      <p className="font-mono text-lg font-bold tracking-widest text-on-surface">{household.inviteCode}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(household.inviteCode);
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        }}
                        title="Copy invite code"
                        className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant transition-colors motion-safe:active:scale-[0.97]"
                      >
                        <span className={`material-symbols-outlined text-lg ${codeCopied ? 'text-primary-container' : ''}`}>content_copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const shareData = { title: 'Join my PetBase household', text: `Join my household on PetBase! Use invite code: ${household.inviteCode}`, url: `${window.location.origin}/join?code=${household.inviteCode}` };
                          if (navigator.share) {
                            try { await navigator.share(shareData); } catch { /* user cancelled */ }
                          } else {
                            await navigator.clipboard.writeText(`Join my PetBase household! Code: ${household.inviteCode}`);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          }
                        }}
                        title="Share invite code"
                        className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant transition-colors motion-safe:active:scale-[0.97]"
                      >
                        <span className="material-symbols-outlined text-lg">share</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'regenerate', label: 'Regenerate invite code? The current code will stop working.', onConfirm: () => { regenerateCode(); setConfirmAction(null); } })}
                        disabled={hhLoading}
                        title="Regenerate invite code (invalidates current code)"
                        className="p-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant transition-colors motion-safe:active:scale-[0.97]"
                      >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Members list with role management */}
              {(() => {
                const isLeader = members.find(m => m.uid === user?.uid)?.role === 'Family Leader';
                const ROLE_COLORS: Record<HouseholdRole, string> = {
                  'Family Leader': 'bg-tertiary-container text-on-tertiary-container',
                  'Extended Family': 'bg-secondary-container text-on-secondary-container',
                  'Child': 'bg-primary-container/20 text-primary-container',
                  'Member': 'bg-surface-container text-on-surface-variant',
                };
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Members</p>
                    {members.map(m => {
                      const isExpanded = expandedMember === m.uid;
                      const isSelf = m.uid === user?.uid;
                      const perms: MemberPermissions = m.permissions ?? DEFAULT_PERMISSIONS;
                      const parental: ParentalControls = m.parentalControls ?? DEFAULT_PARENTAL_CONTROLS;
                      return (
                        <div key={m.uid} className="bg-surface-container rounded-xl overflow-hidden">
                          <div className="flex items-center gap-3 p-3">
                            <div className="w-8 h-8 rounded-full bg-tertiary-container/40 flex items-center justify-center text-sm font-bold text-tertiary shrink-0">
                              {m.displayName?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-on-surface truncate">{m.displayName}{isSelf ? ' (you)' : ''}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[m.role as HouseholdRole] ?? ROLE_COLORS['Member']}`} title={ROLE_DESCRIPTIONS[m.role as HouseholdRole]}>
                              {m.role}
                            </span>
                            {isLeader && !isSelf && (
                              <button
                                type="button"
                                onClick={() => setExpandedMember(isExpanded ? null : m.uid)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-tertiary hover:bg-tertiary-container/30 transition-colors motion-safe:active:scale-[0.97]"
                                title="Manage member"
                              >
                                <span className={`material-symbols-outlined text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                              </button>
                            )}
                            {isLeader && !isSelf && (
                              <button
                                type="button"
                                onClick={() => setConfirmAction({ type: 'kick', label: `Remove ${m.displayName} from household?`, onConfirm: () => { kickMember(m.uid); setConfirmAction(null); } })}
                                disabled={hhLoading}
                                title="Remove member"
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors motion-safe:active:scale-[0.97]"
                              >
                                <span className="material-symbols-outlined text-lg">person_remove</span>
                              </button>
                            )}
                          </div>

                          {/* Expanded: role selector + permission toggles + parental controls */}
                          {isExpanded && isLeader && !isSelf && (
                            <div className="border-t border-outline-variant p-4 space-y-4">
                              {/* Role selector */}
                              <div>
                                <p className="text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wide">Role</p>
                                <div className="flex flex-wrap gap-2">
                                  {(['Extended Family', 'Child', 'Member'] as HouseholdRole[]).map(role => (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => {
                                        if (role === 'Child' && m.role !== 'Child') {
                                          setConfirmAction({ type: 'roleToChild', label: `Change ${m.displayName}'s role to Child? This enables parental controls.`, onConfirm: () => { updateMemberRole(m.uid, role); setConfirmAction(null); } });
                                        } else {
                                          updateMemberRole(m.uid, role);
                                        }
                                      }}
                                      disabled={hhLoading}
                                      title={ROLE_DESCRIPTIONS[role]}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors motion-safe:active:scale-[0.97] ${m.role === role ? ROLE_COLORS[role] + ' ring-2 ring-tertiary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}
                                    >
                                      {role}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Permission toggles (all non-Leader roles) */}
                              {m.role !== 'Family Leader' && (
                                <div>
                                  <p className="text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wide">Permissions</p>
                                  <div className="space-y-2">
                                    {([
                                      { key: 'editPetInfo' as keyof MemberPermissions, label: 'Edit Pet Information' },
                                      { key: 'addMedicalInfo' as keyof MemberPermissions, label: 'Add/Update Medical Information' },
                                      { key: 'createRevokePetCards' as keyof MemberPermissions, label: 'Create/Revoke Pet Cards' },
                                    ]).map(({ key, label }) => (
                                      <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                                        <span className="text-sm text-on-surface-variant">{label}</span>
                                        <ToggleSwitch
                                          checked={perms[key]}
                                          onChange={() => updateMemberPermissions(m.uid, { ...perms, [key]: !perms[key] })}
                                          disabled={hhLoading}
                                        />
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Parental controls (Child role only) */}
                              {m.role === 'Child' && (
                                <div>
                                  <p className="text-xs font-semibold text-on-surface-variant mb-2 uppercase tracking-wide">Parental Controls</p>
                                  <div className="space-y-2">
                                    {([
                                      { key: 'forcePrivateProfile' as keyof ParentalControls, label: 'Force Private Profile' },
                                      { key: 'disableDiscoverability' as keyof ParentalControls, label: 'Disable People Search' },
                                      { key: 'disableCommunityAccess' as keyof ParentalControls, label: 'Disable Community Access' },
                                    ]).map(({ key, label }) => (
                                      <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                                        <span className="text-sm text-on-surface-variant">{label}</span>
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={parental[key]}
                                          onClick={() => updateParentalControls(m.uid, { ...parental, [key]: !parental[key] })}
                                          disabled={hhLoading}
                                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 focus:ring-offset-background ${parental[key] ? 'bg-error' : 'bg-outline-variant'}`}
                                        >
                                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${parental[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  const isDisband = household.ownerId === user?.uid && members.length === 1;
                  setConfirmAction({
                    type: 'leave',
                    label: isDisband ? 'Disband this household? This cannot be undone.' : 'Leave this household?',
                    onConfirm: () => { leaveHousehold(); setConfirmAction(null); },
                  });
                }}
                disabled={hhLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-error-container text-error hover:bg-error-container/30 transition-colors text-sm font-medium motion-safe:active:scale-[0.97]"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                {household.ownerId === user?.uid && members.length === 1 ? 'Disband Household' : 'Leave Household'}
              </button>
            </>
          ) : (
            <>
              {hhView === 'idle' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHhView('create')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-tertiary/40 hover:border-tertiary hover:bg-tertiary-container/20 transition-colors text-sm font-medium text-tertiary motion-safe:active:scale-[0.97]"
                  >
                    <span className="material-symbols-outlined text-2xl">group_add</span>
                    Create Household
                  </button>
                  <button
                    type="button"
                    onClick={() => setHhView('join')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-outline-variant hover:border-outline hover:bg-surface-container transition-colors text-sm font-medium text-on-surface-variant motion-safe:active:scale-[0.97]"
                  >
                    <span className="material-symbols-outlined text-2xl">chevron_right</span>
                    Join with Code
                  </button>
                </div>
              )}

              {hhView === 'create' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={hhName}
                    onChange={e => setHhName(e.target.value)}
                    placeholder="Household name (e.g. The Johnsons)"
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setHhView('idle')} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors motion-safe:active:scale-[0.97]">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (hhName.trim()) createHousehold(hhName.trim()).then(() => setHhView('idle')); }}
                      disabled={!hhName.trim() || hhLoading}
                      className="flex-1 py-2.5 rounded-xl bg-tertiary-container text-on-tertiary-container text-sm font-semibold transition-colors disabled:opacity-50 hover:opacity-90 motion-safe:active:scale-[0.97]"
                    >
                      {hhLoading ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              )}

              {hhView === 'join' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character invite code"
                    maxLength={6}
                    className={`${inputClassMono} tracking-widest uppercase`}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setHhView('idle')} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors motion-safe:active:scale-[0.97]">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (joinCode.length === 6) joinHousehold(joinCode).then(() => setHhView('idle')); }}
                      disabled={joinCode.length < 6 || hhLoading}
                      className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container text-sm font-semibold transition-colors disabled:opacity-50 hover:opacity-90 motion-safe:active:scale-[0.97]"
                    >
                      {hhLoading ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 7 — Emergency Contacts
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="emergency" title="Emergency Contacts" id="section-emergency">
        <p className="text-xs text-on-surface-variant">Stored on this device only — used as fallback on pet cards</p>

        {/* Vet Info */}
        <div className="p-4 bg-surface-container rounded-xl space-y-3">
          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary-container text-lg">local_hospital</span> Vet Info
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Clinic Name</label>
              <input
                type="text"
                value={profileEmergency.vetInfo?.clinic || ''}
                onChange={e => setProfileEmergency(prev => ({ ...prev, vetInfo: { clinic: e.target.value, name: prev.vetInfo?.name || '', phone: prev.vetInfo?.phone || '', address: prev.vetInfo?.address || '' } }))}
                className={inputClass}
                placeholder="Happy Paws Clinic"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Doctor Name</label>
              <input
                type="text"
                value={profileEmergency.vetInfo?.name || ''}
                onChange={e => setProfileEmergency(prev => ({ ...prev, vetInfo: { name: e.target.value, clinic: prev.vetInfo?.clinic || '', phone: prev.vetInfo?.phone || '', address: prev.vetInfo?.address || '' } }))}
                className={inputClass}
                placeholder="Dr. Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Vet Phone</label>
              <input
                type="tel"
                value={profileEmergency.vetInfo?.phone || ''}
                onChange={e => setProfileEmergency(prev => ({ ...prev, vetInfo: { phone: e.target.value, clinic: prev.vetInfo?.clinic || '', name: prev.vetInfo?.name || '', address: prev.vetInfo?.address || '' } }))}
                className={inputClass}
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Vet Address</label>
              <input
                type="text"
                value={profileEmergency.vetInfo?.address || ''}
                onChange={e => setProfileEmergency(prev => ({ ...prev, vetInfo: { address: e.target.value, clinic: prev.vetInfo?.clinic || '', name: prev.vetInfo?.name || '', phone: prev.vetInfo?.phone || '' } }))}
                className={inputClass}
                placeholder="123 Vet Clinic Way"
              />
            </div>
          </div>
        </div>

        {/* Owner phone */}
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1.5 flex items-center justify-between">
            Owner / Primary Phone
            <button
              type="button"
              onClick={() => setShowEmergencyPII(!showEmergencyPII)}
              className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors motion-safe:active:scale-[0.97]"
            >
              <span className="material-symbols-outlined text-sm">{showEmergencyPII ? 'visibility_off' : 'visibility'}</span>
              {showEmergencyPII ? "Mask PII" : "Show PII"}
            </button>
          </label>
          <input
            type={showEmergencyPII ? "tel" : "password"}
            value={profileEmergency.ownerPhone || ''}
            onChange={e => setProfileEmergency(prev => ({ ...prev, ownerPhone: e.target.value }))}
            className={inputClassMono}
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Additional contacts */}
        <div className="p-4 bg-surface-container rounded-xl space-y-3">
          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-lg">call</span> Additional Contacts (up to 2)
          </h3>
          {[0, 1].map(index => {
            const contact = profileEmergency.additionalContacts?.[index] || { name: '', phone: '' };
            const updateContact = (field: 'name' | 'phone', value: string) => {
              setProfileEmergency(prev => {
                const base: Array<{ name: string; phone: string }> = [
                  prev.additionalContacts?.[0] || { name: '', phone: '' },
                  prev.additionalContacts?.[1] || { name: '', phone: '' },
                ];
                base[index] = { ...base[index], [field]: value };
                return { ...prev, additionalContacts: base.filter(c => c.name || c.phone) };
              });
            };
            return (
              <div key={index} className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Name</label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={e => updateContact('name', e.target.value)}
                    className={inputClass}
                    placeholder={`Contact ${index + 1}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Phone</label>
                  <input
                    type={showEmergencyPII ? "tel" : "password"}
                    value={contact.phone}
                    onChange={e => updateContact('phone', e.target.value)}
                    className={inputClassMono}
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveEmergencyContacts}
            className="px-5 py-2 bg-primary-container hover:opacity-90 text-on-primary-container rounded-xl font-semibold text-sm transition-all motion-safe:active:scale-[0.97]"
          >
            Save Emergency Contacts
          </button>
          {emergencySaved && <span className="text-sm text-primary-container font-medium flex items-center gap-1"><span className="material-symbols-outlined text-lg">check_circle</span> Saved</span>}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 8 — Danger Zone
          ════════════════════════════════════════════════════════════════════ */}
      <Section icon="warning" title="Danger Zone" danger id="section-danger">
        <div className="p-4 bg-error-container/20 border border-error-container rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-error mt-0.5">report</span>
            <div>
              <p className="font-semibold text-error text-sm">Irreversible Actions</p>
              <p className="text-sm text-on-surface-variant mt-1">
                Once you delete your account, there is no going back. All pet profiles, data, and
                settings will be permanently removed.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="bg-error-container/30 text-error border border-error-container hover:bg-error-container/50 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 motion-safe:active:scale-[0.97]"
        >
          <span className="material-symbols-outlined text-lg">delete_forever</span>
          Delete Account
        </button>
      </Section>

      {/* ── Global Footer ────────────────────────────────────────────────── */}
      <footer className="glass-card px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">sync</span>
          Last synced: {new Date().toLocaleString()}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors motion-safe:active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={saving || !isDirty}
            className="px-5 py-2 rounded-xl bg-primary-container text-on-primary-container text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all motion-safe:active:scale-[0.97] flex items-center gap-2"
          >
            {saving && <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </footer>

      {/* ── Modals ───────────────────────────────────────────────────────── */}

      {/* Household Confirmation Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm action" onClick={() => setConfirmAction(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="glass-card p-6 shadow-xl max-w-sm w-full space-y-4"
            >
              <p className="text-sm text-on-surface-variant font-medium">{confirmAction.label}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors motion-safe:active:scale-[0.97]">
                  Cancel
                </button>
                <button onClick={confirmAction.onConfirm} className="flex-1 py-2 rounded-xl bg-error text-on-error text-sm font-semibold transition-colors hover:opacity-90 motion-safe:active:scale-[0.97]">
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Encrypted Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="backup-modal-title">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card shadow-2xl w-full max-w-md"
          >
            <div className="p-6 border-b border-outline-variant">
              <h3 className="text-xl font-bold text-on-surface flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
                <span className="material-symbols-outlined text-primary-container">vpn_key</span>
                {backupMode === 'export' ? 'Export Encrypted Backup' : 'Import Encrypted Backup'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {backupMode === 'export' ? (
                <>
                  <p className="text-sm text-on-surface-variant">
                    Set a backup password. You will need this password to restore the backup on another device.
                    Store it somewhere safe — it cannot be recovered.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Backup Password</label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={e => setBackupPassword(e.target.value)}
                      className={inputClass}
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={backupConfirm}
                      onChange={e => setBackupConfirm(e.target.value)}
                      className={inputClass}
                      placeholder="Repeat password"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-on-surface-variant">
                    Select your backup file and enter the backup password you set when exporting.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Backup File</label>
                    <input
                      type="file"
                      ref={backupFileRef}
                      accept=".json"
                      onChange={e => setBackupFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary-container/20 file:text-primary-container hover:file:bg-primary-container/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Backup Password</label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={e => setBackupPassword(e.target.value)}
                      className={inputClass}
                      placeholder="Enter backup password"
                    />
                  </div>
                </>
              )}

              {backupError && (
                <p className="text-sm text-error bg-error-container/40 p-3 rounded-lg">{backupError}</p>
              )}
              {backupSuccess && (
                <p className="text-sm text-primary-container bg-primary-container/10 p-3 rounded-lg">{backupSuccess}</p>
              )}
            </div>
            <div className="p-5 border-t border-outline-variant flex gap-3">
              <button
                type="button"
                onClick={() => { setShowBackupModal(false); setBackupPassword(''); setBackupConfirm(''); setBackupFile(null); setBackupError(''); setBackupSuccess(''); }}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container transition-colors motion-safe:active:scale-[0.97]"
              >
                {backupSuccess ? 'Close' : 'Cancel'}
              </button>
              {!backupSuccess && (
                <button
                  type="button"
                  disabled={backupWorking || !backupPassword || (backupMode === 'export' ? !backupConfirm : !backupFile)}
                  onClick={backupMode === 'export' ? handleExportBackup : handleImportBackup}
                  className="flex-1 py-2.5 rounded-xl bg-primary-container hover:opacity-90 text-on-primary-container font-semibold transition-all disabled:opacity-50 motion-safe:active:scale-[0.97]"
                >
                  {backupWorking ? 'Working...' : backupMode === 'export' ? 'Download Backup' : 'Restore Backup'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Delete account confirmation">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onMouseDown={closeDeleteModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative glass-card p-6 shadow-2xl w-full max-w-md z-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-error-container rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error">delete_forever</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
                Delete Account
              </h3>
            </div>
            <p className="text-on-surface-variant text-sm mb-4">
              This action is{' '}
              <strong className="text-on-surface">
                permanent and cannot be undone
              </strong>
              . All your data, pet profiles, and settings will be permanently deleted.
            </p>
            <label
              htmlFor="deleteConfirm"
              className="block text-sm font-medium text-on-surface-variant mb-1.5"
            >
              Type your email address to confirm:
            </label>
            <input
              id="deleteConfirm"
              type="email"
              value={deleteEmailInput}
              onChange={(e) => {
                setDeleteEmailInput(e.target.value);
                setDeleteError('');
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-error transition-all mb-3"
              placeholder={user?.email || ''}
            />
            {deleteError && (
              <p className="text-sm text-error bg-error-container/40 p-3 rounded-lg mb-3">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container transition-colors motion-safe:active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteEmailInput !== user?.email || deleting}
                className="flex-1 py-2.5 rounded-xl bg-error hover:opacity-90 text-on-error font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed motion-safe:active:scale-[0.97]"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
        shape="circle"
      />

      <AnimatePresence>
        {showFeedback && (
          <FeedbackModal
            userEmail={user?.email ?? undefined}
            onClose={() => setShowFeedback(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Save Button — visible only when form has unsaved changes */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-20 md:bottom-6 right-6 z-50"
          >
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 bg-primary-container hover:opacity-90 disabled:opacity-50 text-on-primary-container px-5 py-3 rounded-2xl font-semibold shadow-xl transition-all motion-safe:active:scale-95"
            >
              {saving ? (
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-lg">check_circle</span>
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
