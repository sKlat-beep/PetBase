import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Mail,
  MapPin,
  Shield,
  Lock,
  Smartphone,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Camera,
  Download,
  Upload,
  KeyRound,
  Users,
  Copy,
  RefreshCw,
  LogOut,
  UserMinus,
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  MessageSquare,
  CheckCircle2,
  Phone,
  HeartPulse,
  Globe,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  UserX,
  Loader2,
  Pencil,
  Check,
  X,
  Info,
  Share2,
} from 'lucide-react';
import type { HouseholdRole, MemberPermissions, ParentalControls } from '../types/household';
import { DEFAULT_PERMISSIONS, DEFAULT_PARENTAL_CONTROLS, EXTENDED_FAMILY_PERMISSIONS, ROLE_DESCRIPTIONS } from '../types/household';
import { updateProfile, deleteUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { loadUserProfile, getSignInLog, type SignInLogEntry } from '../lib/firestoreService';
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

function shortUA(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'Unknown browser';
}

export function ProfileSettings() {
  const { user, profile, updateProfile: updateContextProfile } = useAuth();
  const { accentColor, setAccentColor } = useTheme();

  const ACCENT_COLORS = [
    { key: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
    { key: 'sky',     label: 'Sky',     bg: 'bg-sky-500' },
    { key: 'violet',  label: 'Violet',  bg: 'bg-violet-500' },
    { key: 'rose',    label: 'Rose',    bg: 'bg-rose-500' },
    { key: 'amber',   label: 'Amber',   bg: 'bg-amber-500' },
    { key: 'indigo',  label: 'Indigo',  bg: 'bg-indigo-500' },
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
  const [avatarShape, setAvatarShape] = useState<'circle' | 'square' | 'squircle'>('circle');
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

  // PII Visibility Toggles
  const [showEmail, setShowEmail] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showEmergencyPII, setShowEmergencyPII] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState<'daily' | 'weekly' | 'off'>('off');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
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
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);

  // Data export (GDPR)
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  // Load profile from Firestore on mount — address arrives already decrypted
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    // Initialise push permission status from browser
    setPushStatus(getPushPermissionStatus());
    loadUserProfile(user.uid)
      .then((profile) => {
        if (profile) {
          setDisplayName(profile.displayName || user.displayName || '');
          setAddress(profile.address || '');
          setIsPrivate(profile.visibility === 'Private');
          if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
          if (profile.avatarShape && (profile.avatarShape as string) !== 'hexagon') setAvatarShape(profile.avatarShape);
          // Notification prefs
          setEmailNotifications(profile.emailNotifications ?? false);
          setEmailDigestFrequency(profile.emailDigestFrequency ?? 'off');
          setPushNotificationsEnabled(profile.pushNotifications ?? false);
          // Privacy prefs
          setDisableDMs(profile.disableDMs ?? false);
          setDisableGroupInvites(profile.disableGroupInvites ?? false);
          setShowLastActive(profile.showLastActive !== false); // default true
        }
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
        avatarShape,
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


  // ── Notifications save ───────────────────────────────────────────────────
  const handleSaveNotifications = async () => {
    if (!user) return;
    setNotifSaving(true);
    try {
      await updateContextProfile({
        emailNotifications,
        emailDigestFrequency: emailNotifications ? emailDigestFrequency : 'off',
        pushNotifications: pushNotificationsEnabled,
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } catch (err: any) {
      console.error('Failed to save notification settings:', err);
    } finally {
      setNotifSaving(false);
    }
  };

  // ── Push toggle handler ──────────────────────────────────────────────────
  const handlePushToggle = async () => {
    if (!isPushSupported()) return;
    if (!pushNotificationsEnabled) {
      // Turning ON — request permission + get FCM token
      const token = await requestPushPermission(user!.uid);
      const newStatus = getPushPermissionStatus();
      setPushStatus(newStatus);
      if (token && newStatus === 'granted') {
        setPushNotificationsEnabled(true);
      }
    } else {
      // Turning OFF — just update profile preference; can't programmatically revoke permission
      setPushNotificationsEnabled(false);
    }
  };

  // ── Privacy save ─────────────────────────────────────────────────────────
  const handleSavePrivacy = async () => {
    if (!user) return;
    setPrivacySaving(true);
    try {
      await updateContextProfile({
        visibility: isPrivate ? 'Private' : 'Public',
        disableDMs,
        disableGroupInvites,
        showLastActive,
      });
      setPrivacySaved(true);
      setTimeout(() => setPrivacySaved(false), 2500);
    } catch (err: any) {
      console.error('Failed to save privacy settings:', err);
    } finally {
      setPrivacySaving(false);
    }
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
        <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
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
      className="space-y-8 max-w-2xl"
    >
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Profile & Settings
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your account information and privacy preferences.
          </p>
        </div>
        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm font-medium transition-colors self-start shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          Feedback / Report Issue
        </button>
      </header>

      {/* Jump-Navigate Toolbar */}
      <nav aria-label="Profile sections" className="flex flex-wrap gap-2">
        {[
          { id: 'section-profile', label: 'Profile Info', icon: '👤' },
          { id: 'section-emergency', label: 'Emergency', icon: '🚨' },
          { id: 'section-notifications', label: 'Notifications', icon: '🔔' },
          { id: 'section-privacy', label: 'Privacy', icon: '🔒' },
          { id: 'section-family', label: 'Family', icon: '🏠' },
          { id: 'section-logs', label: 'Activity', icon: '📋' },
          { id: 'section-appearance', label: 'Appearance', icon: '🎨' },
          { id: 'section-sync', label: 'Sync', icon: '🔄' },
          { id: 'section-data', label: 'Data', icon: '💾' },
          { id: 'section-danger', label: 'Danger Zone', icon: '⚠️' },
        ].map(({ id, label, icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </a>
        ))}
      </nav>

      {/* New-device encryption warning */}
      {showEncryptionWarning && (
        <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100">New device detected</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Your encrypted data (medical records, expenses, pet notes) is not yet accessible on this device.
              Enable Cross-Device Sync to automatically access your data on any device you sign in to.
              Otherwise, restore from a backup file.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <a href="#section-sync" className="text-sm font-medium text-amber-800 dark:text-amber-200 underline hover:no-underline">
                Set up sync
              </a>
              <button
                type="button"
                onClick={() => { setBackupMode('import'); setShowBackupModal(true); }}
                className="text-sm font-medium text-amber-800 dark:text-amber-200 underline hover:no-underline"
              >
                Import backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Information */}
      <form
        id="section-profile"
        onSubmit={handleSaveProfile}
        className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-6"
      >
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          Profile Information
        </h2>

        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className={`w-20 h-20 bg-neutral-200 dark:bg-neutral-600 overflow-hidden shrink-0 ${avatarShape === 'circle' ? 'rounded-full' : avatarShape === 'square' ? 'rounded-xl' : avatarShape === 'squircle' ? 'rounded-[1.5rem]' : 'rounded-full'} shadow-md transition-all duration-300`}>
              {avatarUrl || user?.photoURL ? (
                <img
                  src={avatarUrl || user?.photoURL || ''}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-3xl font-bold">
                  {displayName?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* The invisible button trigger, overlay with the same shape so corners don't overflow hover states */}
            {/* Tailwind doesn't have a reliable built-in clip-path for squircle out of the box so we inline it */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              style={{
                borderRadius: avatarShape === 'circle' ? '9999px' : avatarShape === 'square' ? '0.75rem' : avatarShape === 'squircle' ? '1.5rem' : '0',
              }}
            >
              <Camera className="w-6 h-6" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
          </div>

          <div className="space-y-3 flex-1">
            <div>
              <p className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                {displayName || 'Pet Parent'}
              </p>
              {profile?.username && (
                <div className="flex items-center gap-2 mt-0.5 mb-1.5">
                  <span className="text-xs font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
                    @{profile.username.split('#')[0]}<span className="opacity-60">#{profile.username.split('#')[1]}</span>
                  </span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(profile.username!)} className="text-neutral-400 hover:text-emerald-500 transition-colors" title="Copy username">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{user?.email}</p>
            </div>

            <div className="flex gap-2 text-sm bg-neutral-50 dark:bg-neutral-700/30 p-1.5 rounded-xl w-fit border border-neutral-200 dark:border-neutral-700 shadow-sm">
              {(['circle', 'square', 'squircle'] as const).map(shape => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => { setAvatarShape(shape); setIsDirty(true); }}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors font-medium ${avatarShape === shape ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm border border-neutral-200 dark:border-neutral-500' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setIsDirty(true); }}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type={showEmail ? "email" : "password"}
              value={user?.email || ''}
              readOnly
              className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700/50 text-neutral-400 dark:text-neutral-500 cursor-not-allowed font-mono"
            />
            <button
              type="button"
              onClick={() => setShowEmail(!showEmail)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              title={showEmail ? "Hide Email" : "Show Email"}
            >
              {showEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
            Email changes require re-authentication. Contact support to update your email.
          </p>
        </div>

        {/* Physical Address — PII field, encrypted by saveUserProfile before Firestore write */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            Physical Address{' '}
            <span className="text-xs font-normal bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full ml-1">
              Encrypted
            </span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              id="address"
              type={showAddress ? "text" : "password"}
              value={address}
              onChange={(e) => { setAddress(e.target.value); setIsDirty(true); }}
              className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors font-mono"
              placeholder="123 Main St, City, State"
            />
            <button
              type="button"
              onClick={() => setShowAddress(!showAddress)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              title={showAddress ? "Hide Address" : "Show Address"}
            >
              {showAddress ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5">
            AES-256-GCM encrypted client-side before being stored. The server never sees plaintext.
          </p>
        </div>



        {saveError && (
          <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
            {saveError}
          </p>
        )}

        {saveSuccess && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            Changes saved
          </p>
        )}
      </form>

      {/* Emergency & Vet Contacts */}
      <div id="section-emergency" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-500" />
            Emergency &amp; Vet Contacts
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-[180px] text-right">Stored on this device only — used as fallback on pet cards</p>
        </div>

        {/* Vet Info */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl space-y-3">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-emerald-500" /> Vet Info
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Clinic Name</label>
              <input
                type="text"
                value={profileEmergency.vetInfo?.clinic || ''}
                onChange={e => setProfileEmergency(prev => ({ ...prev, vetInfo: { clinic: e.target.value, name: prev.vetInfo?.name || '', phone: prev.vetInfo?.phone || '', address: prev.vetInfo?.address || '' } }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Happy Paws Clinic"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Doctor Name</label>
              <input
                type="text"
                value={profileEmergency.vetInfo?.name || ''}
                onChange={e => setProfileEmergency(prev => ({ ...prev, vetInfo: { name: e.target.value, clinic: prev.vetInfo?.clinic || '', phone: prev.vetInfo?.phone || '', address: prev.vetInfo?.address || '' } }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Dr. Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Vet Phone</label>
              <input
                type="tel"
                value={profileEmergency.vetInfo?.phone || ''}
                onChange={e => setProfileEmergency(prev => ({ ...prev, vetInfo: { phone: e.target.value, clinic: prev.vetInfo?.clinic || '', name: prev.vetInfo?.name || '', address: prev.vetInfo?.address || '' } }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Vet Address</label>
              <input
                type="text"
                value={profileEmergency.vetInfo?.address || ''}
                onChange={e => setProfileEmergency(prev => ({ ...prev, vetInfo: { address: e.target.value, clinic: prev.vetInfo?.clinic || '', name: prev.vetInfo?.name || '', phone: prev.vetInfo?.phone || '' } }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="123 Vet Clinic Way"
              />
            </div>
          </div>
        </div>

        {/* Owner phone */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center justify-between">
            Owner / Primary Phone
            <button
              type="button"
              onClick={() => setShowEmergencyPII(!showEmergencyPII)}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            >
              {showEmergencyPII ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showEmergencyPII ? "Mask PII" : "Show PII"}
            </button>
          </label>
          <input
            type={showEmergencyPII ? "tel" : "password"}
            value={profileEmergency.ownerPhone || ''}
            onChange={e => setProfileEmergency(prev => ({ ...prev, ownerPhone: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Additional contacts */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl space-y-3">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-blue-500" /> Additional Contacts (up to 2)
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
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={e => updateContact('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder={`Contact ${index + 1}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Phone</label>
                  <input
                    type={showEmergencyPII ? "tel" : "password"}
                    value={contact.phone}
                    onChange={e => updateContact('phone', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
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
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Save Emergency Contacts
          </button>
          {emergencySaved && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
        </div>
      </div>

      {/* Privacy & Visibility */}
      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <div id="section-notifications" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          Notifications
        </h2>

        {/* In-app — always on */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">In-app notifications</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Always on — you'll always receive in-app notifications.
            </p>
          </div>
          <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full">
            Always on
          </span>
        </div>

        {/* Email notifications */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
          <div className="flex-1 min-w-0 mr-4">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">Email notifications</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Receive email alerts for important activity.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailNotifications}
            onClick={() => setEmailNotifications(v => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${emailNotifications ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {emailNotifications && (
          <div className="px-4 pb-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Email frequency
            </label>
            <select
              value={emailDigestFrequency}
              onChange={e => setEmailDigestFrequency(e.target.value as 'daily' | 'weekly' | 'off')}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700/50 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <option value="off">Off (manual only)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>
        )}

        {/* Push notifications */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
          <div className="flex-1 min-w-0 mr-4">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">Push notifications</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {pushStatus === 'unsupported'
                ? 'Not supported in this browser.'
                : pushStatus === 'denied'
                  ? 'Blocked — update permissions in your browser settings.'
                  : pushStatus === 'granted'
                    ? 'Enabled in your browser.'
                    : 'Toggling on will request browser permission.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pushNotificationsEnabled}
            onClick={handlePushToggle}
            disabled={pushStatus === 'unsupported' || pushStatus === 'denied'}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${pushNotificationsEnabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${pushNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Sound alerts for new messages */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sound alerts for new messages</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Play a chime when a new direct message arrives</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => playNotificationChime()}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={toggleSound}
              role="switch"
              aria-checked={notificationSound}
              className={`relative w-10 h-5 rounded-full transition-colors ${notificationSound ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${notificationSound ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSaveNotifications}
            disabled={notifSaving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {notifSaving ? 'Saving…' : 'Save Notifications'}
          </button>
          {notifSaved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* ── Privacy & Visibility ──────────────────────────────────────────── */}
      <div id="section-privacy" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          Privacy & Visibility
        </h2>
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">Profile Visibility</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isPrivate
                ? 'Only visible to people you share with.'
                : 'Visible to the PetBase community.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setIsPrivate((v) => !v); setIsDirty(true); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isPrivate ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            role="switch"
            aria-checked={isPrivate}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Current status</span>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${isPrivate
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
              }`}
          >
            {isPrivate ? 'Private' : 'Public'}
          </span>
        </div>


        {/* Direct messages */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <UserX className="w-4 h-4 text-neutral-500" />
            Messaging &amp; Invites
          </h3>

          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">Disable direct messages</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Prevent other users from sending you DMs.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={disableDMs}
              onClick={() => setDisableDMs(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${disableDMs ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${disableDMs ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">Disable group invites</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Prevent group admins from inviting you to groups.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={disableGroupInvites}
              onClick={() => setDisableGroupInvites(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${disableGroupInvites ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${disableGroupInvites ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">Show my active status</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Let others see when you were last active in DMs.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showLastActive}
              onClick={() => setShowLastActive(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${showLastActive ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${showLastActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSavePrivacy}
              disabled={privacySaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {privacySaving ? 'Saving…' : 'Save Privacy'}
            </button>
            {privacySaved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        </div>

        {/* Blocked users */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <BellOff className="w-4 h-4 text-neutral-500" />
            Blocked Users
          </h3>
          {(profile?.blockedUsers?.length ?? 0) === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
              You haven't blocked anyone.
            </p>
          ) : (
            <div className="rounded-xl border border-neutral-100 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700">
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
                    {/* Avatar placeholder */}
                    <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-200">
                        {initials || '?'}
                      </span>
                    </div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate flex-1">{displayName}</span>
                    <button
                      type="button"
                      onClick={() => unblockUser(blockedUid)}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 shrink-0"
                    >
                      Unblock
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-600" />
          Security
        </h2>
        {isPasswordUser && (
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-neutral-400" />
              <div className="text-left">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">Change Password</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Update your account password
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>
        )}
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-neutral-400" />
            <div className="text-left">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                Two-Factor Authentication
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Add an extra layer of security
              </p>
            </div>
          </div>
          <span className="text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 px-2 py-1 rounded-md">
            Coming Soon
          </span>
        </button>
        <div className="py-3 border-t border-neutral-100 dark:border-neutral-700">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Export Your Data</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Download a copy of all your PetBase data as a JSON file. Link expires in 24 hours.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Preparing export…' : 'Export My Data'}
          </button>
          {exportUrl && (
            <a
              href={exportUrl}
              download
              className="mt-2 block text-sm text-emerald-600 dark:text-emerald-400 underline"
            >
              Download ready — click to save
            </a>
          )}
        </div>

        {/* Recent Sign-ins */}
        {signInLog.length > 0 && (
          <div className="pt-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-neutral-400" />
              Recent Sign-ins
            </p>
            <ul className="space-y-2">
              {signInLog.map((entry, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-100 dark:border-neutral-700 text-xs"
                >
                  <span className="text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]" title={entry.userAgent}>
                    {shortUA(entry.userAgent)}
                  </span>
                  <span className="text-neutral-400 dark:text-neutral-500 shrink-0 ml-2">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Family Sharing */}
      <div id="section-family" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-5">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-600" /> Family Sharing
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Create or join a household to share pet co-management access with family members.
        </p>

        {hhError && (
          <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {hhError}
            <button onClick={clearHhError} className="ml-auto text-rose-400 hover:text-rose-600" aria-label="Dismiss error"><LogOut className="w-4 h-4" /></button>
          </div>
        )}

        {hhLoading && !household ? (
          <div className="flex items-center justify-center py-8 gap-2 text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading household...</span>
          </div>
        ) : household ? (
          <>
            {/* Current household */}
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  {editingHhName ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={newHhName} onChange={e => setNewHhName(e.target.value)} autoFocus className="px-2 py-1 rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-neutral-700 text-sm font-semibold text-violet-900 dark:text-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500 w-48" />
                      <button onClick={() => { if (newHhName.trim()) renameHousehold(newHhName.trim()).then(() => setEditingHhName(false)); }} className="p-1 text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingHhName(false)} className="p-1 text-neutral-400 hover:text-neutral-600" title="Cancel"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-violet-900 dark:text-violet-100">{household.name}</p>
                      {household.ownerId === user?.uid && (
                        <button onClick={() => { setNewHhName(household.name); setEditingHhName(true); }} className="p-1 text-violet-400 hover:text-violet-600" title="Rename household"><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">
                    {members.find(m => m.uid === user?.uid)?.role ?? (household.ownerId === user?.uid ? 'Family Leader' : 'Member')}
                  </p>
                </div>
                <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-full font-medium">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Invite code — owner only */}
              {household.ownerId === user?.uid && (
                <div className="bg-white dark:bg-neutral-700 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Invite Code</p>
                    <p className="font-mono text-lg font-bold tracking-widest text-neutral-900 dark:text-neutral-100">{household.inviteCode}</p>
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
                      className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-600 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-neutral-600 dark:text-neutral-300 transition-colors"
                    >
                      {codeCopied ? <Copy className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
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
                      className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-600 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-neutral-600 dark:text-neutral-300 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'regenerate', label: 'Regenerate invite code? The current code will stop working.', onConfirm: () => { regenerateCode(); setConfirmAction(null); } })}
                      disabled={hhLoading}
                      title="Regenerate invite code (invalidates current code)"
                      className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-neutral-600 dark:text-neutral-300 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Members list with role management */}
            {(() => {
              const isLeader = members.find(m => m.uid === user?.uid)?.role === 'Family Leader';
              const ROLE_COLORS: Record<HouseholdRole, string> = {
                'Family Leader': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
                'Extended Family': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
                'Child': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
                'Member': 'bg-neutral-100 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400',
              };
              return (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Members</p>
                  {members.map(m => {
                    const isExpanded = expandedMember === m.uid;
                    const isSelf = m.uid === user?.uid;
                    const perms: MemberPermissions = m.permissions ?? DEFAULT_PERMISSIONS;
                    const parental: ParentalControls = m.parentalControls ?? DEFAULT_PARENTAL_CONTROLS;
                    return (
                      <div key={m.uid} className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-sm font-bold text-violet-700 dark:text-violet-300 shrink-0">
                            {m.displayName?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{m.displayName}{isSelf ? ' (you)' : ''}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[m.role as HouseholdRole] ?? ROLE_COLORS['Member']}`} title={ROLE_DESCRIPTIONS[m.role as HouseholdRole]}>
                            {m.role}
                          </span>
                          {isLeader && !isSelf && (
                            <button
                              type="button"
                              onClick={() => setExpandedMember(isExpanded ? null : m.uid)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                              title="Manage member"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                          {isLeader && !isSelf && (
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: 'kick', label: `Remove ${m.displayName} from household?`, onConfirm: () => { kickMember(m.uid); setConfirmAction(null); } })}
                              disabled={hhLoading}
                              title="Remove member"
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Expanded: role selector + permission toggles + parental controls */}
                        {isExpanded && isLeader && !isSelf && (
                          <div className="border-t border-neutral-200 dark:border-neutral-600 p-4 space-y-4">
                            {/* Role selector */}
                            <div>
                              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wide">Role</p>
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
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${m.role === role ? ROLE_COLORS[role] + ' ring-2 ring-violet-400' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                                  >
                                    {role}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Permission toggles (all non-Leader roles) */}
                            {m.role !== 'Family Leader' && (
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wide">Permissions</p>
                                <div className="space-y-2">
                                  {([
                                    { key: 'editPetInfo' as keyof MemberPermissions, label: 'Edit Pet Information' },
                                    { key: 'addMedicalInfo' as keyof MemberPermissions, label: 'Add/Update Medical Information' },
                                    { key: 'createRevokePetCards' as keyof MemberPermissions, label: 'Create/Revoke Pet Cards' },
                                  ]).map(({ key, label }) => (
                                    <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                                      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={perms[key]}
                                        onClick={() => updateMemberPermissions(m.uid, { ...perms, [key]: !perms[key] })}
                                        disabled={hhLoading}
                                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${perms[key] ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                                      >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${perms[key] ? 'translate-x-4' : 'translate-x-0'}`} />
                                      </button>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Parental controls (Child role only) */}
                            {m.role === 'Child' && (
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wide">Parental Controls</p>
                                <div className="space-y-2">
                                  {([
                                    { key: 'forcePrivateProfile' as keyof ParentalControls, label: 'Force Private Profile' },
                                    { key: 'disableDiscoverability' as keyof ParentalControls, label: 'Disable People Search' },
                                    { key: 'disableCommunityAccess' as keyof ParentalControls, label: 'Disable Community Access' },
                                  ]).map(({ key, label }) => (
                                    <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                                      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={parental[key]}
                                        onClick={() => updateParentalControls(m.uid, { ...parental, [key]: !parental[key] })}
                                        disabled={hhLoading}
                                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${parental[key] ? 'bg-rose-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                                      >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${parental[key] ? 'translate-x-4' : 'translate-x-0'}`} />
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
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
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors text-sm font-medium text-violet-600 dark:text-violet-400"
                >
                  <Users className="w-6 h-6" />
                  Create Household
                </button>
                <button
                  type="button"
                  onClick={() => setHhView('join')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-600 hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                  <ChevronRight className="w-6 h-6" />
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
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setHhView('idle')} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (hhName.trim()) createHousehold(hhName.trim()).then(() => setHhView('idle')); }}
                    disabled={!hhName.trim() || hhLoading}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {hhLoading ? 'Creating…' : 'Create'}
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
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm font-mono tracking-widest uppercase"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setHhView('idle')} className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (joinCode.length === 6) joinHousehold(joinCode).then(() => setHhView('idle')); }}
                    disabled={joinCode.length < 6 || hhLoading}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {hhLoading ? 'Joining…' : 'Join'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Appearance — Dark Mode toggle lives exclusively here */}
      <div id="section-appearance" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Appearance
        </h2>
        <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Accent Color</h3>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_COLORS.map(({ key, label, bg }) => (
              <button
                key={key}
                onClick={() => setAccentColor(key as any)}
                aria-label={label}
                className={`w-8 h-8 rounded-full ${bg} transition-all ${
                  accentColor === key
                    ? 'ring-2 ring-offset-2 ring-neutral-400 dark:ring-neutral-500 scale-110'
                    : 'hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Cross-Device Sync */}
      <div id="section-sync" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-violet-600" />
            Cross-Device Sync
          </h2>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${vaultEnabled ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'}`}>
            {vaultEnabled ? 'Enabled' : 'Not enabled'}
          </span>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Enable automatic cross-device sync to securely store your encryption key in the cloud.
          Your encrypted data (medical records, expenses, notes) will be accessible on any device
          you sign in to — no extra passwords needed. The server only ever stores encrypted ciphertext.
        </p>

        {vaultEnabled && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Sync is active. Sign in on any device to automatically access your encrypted data.
            </p>
          </div>
        )}

        {syncError && (
          <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
            {syncError}
          </p>
        )}
        {syncSuccess && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
            {syncSuccess}
          </p>
        )}

        {!vaultEnabled && (
          <button
            onClick={handleEnableSync}
            disabled={syncSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {syncSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {syncSaving ? 'Enabling…' : 'Enable Cross-Device Sync'}
          </button>
        )}
      </div>

      {/* Encrypted Backup */}
      <div id="section-data" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-600" />
          Encrypted Backup
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Export an encrypted backup for offline recovery. The backup file is protected by a password you choose.
          If you have Cross-Device Sync enabled, your data is also accessible automatically on any signed-in device.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => { setBackupMode('export'); setShowBackupModal(true); setBackupError(''); setBackupSuccess(''); }}
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export Backup
          </button>
          <button
            type="button"
            onClick={() => { setBackupMode('import'); setShowBackupModal(true); setBackupError(''); setBackupSuccess(''); }}
            className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> Import Backup
          </button>
        </div>
      </div>

      {/* Personal Activity Logs */}
      <div id="section-logs" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-4">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          Personal Activity Log
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          A rolling 60-day log of your key actions in PetBase. Stored locally on this device only.
        </p>

        <button
          onClick={() => {
            setShowPersonalLogs(v => !v);
            if (!showPersonalLogs && user) getActivityLog(user.uid).then(setActivityLog).catch(() => {});
          }}
          className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <Clock className="w-4 h-4" />
          My Activity
          {activityLog.length > 0 && (
            <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-500 px-1.5 py-0.5 rounded-full">{activityLog.length}</span>
          )}
          {showPersonalLogs ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>

        {showPersonalLogs && (
          <div className="rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
            {activityLog.length === 0 ? (
              <p className="text-sm text-neutral-400 p-4">No activity logged yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700 max-h-80 overflow-y-auto">
                {activityLog.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-neutral-700 dark:text-neutral-300">{entry.action}</span>
                    <span className="text-neutral-400 text-xs whitespace-nowrap ml-4">{formatRelativeTime(entry.timestamp)}</span>
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
              className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <History className="w-4 h-4" />
              Family Audit Log
              {auditLog.length > 0 && <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-500 px-1.5 py-0.5 rounded-full">{auditLog.length}</span>}
              {showAuditLog ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>
            {showAuditLog && (
              <div className="rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
                {auditLog.length === 0 ? (
                  <p className="text-sm text-neutral-400 p-4">No audit entries yet.</p>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-700 max-h-80 overflow-y-auto">
                    {auditLog.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">{entry.actorName}</span>
                          <span className="text-neutral-500 dark:text-neutral-400 ml-1">— {entry.action}</span>
                        </div>
                        <span className="text-neutral-400 text-xs whitespace-nowrap ml-4">{formatRelativeTime(entry.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Danger Zone */}
      <div id="section-danger" className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-rose-100 dark:border-rose-900/30 space-y-4">
        <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Once you delete your account, there is no going back. All pet profiles, data, and
          settings will be permanently removed.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Household Confirmation Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-xl border border-neutral-200 dark:border-neutral-700 max-w-sm w-full space-y-4"
            >
              <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">{confirmAction.label}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmAction.onConfirm} className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors">
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Encrypted Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-700">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                {backupMode === 'export' ? 'Export Encrypted Backup' : 'Import Encrypted Backup'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {backupMode === 'export' ? (
                <>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Set a backup password. You will need this password to restore the backup on another device.
                    Store it somewhere safe — it cannot be recovered.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Backup Password</label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={e => setBackupPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={backupConfirm}
                      onChange={e => setBackupConfirm(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Repeat password"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Select your backup file and enter the backup password you set when exporting.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Backup File</label>
                    <input
                      type="file"
                      ref={backupFileRef}
                      accept=".json"
                      onChange={e => setBackupFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-neutral-600 dark:text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-emerald-50 dark:file:bg-emerald-950/30 file:text-emerald-700 dark:file:text-emerald-400 hover:file:bg-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Backup Password</label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={e => setBackupPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter backup password"
                    />
                  </div>
                </>
              )}

              {backupError && (
                <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">{backupError}</p>
              )}
              {backupSuccess && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">{backupSuccess}</p>
              )}
            </div>
            <div className="p-5 border-t border-neutral-100 dark:border-neutral-700 flex gap-3">
              <button
                type="button"
                onClick={() => { setShowBackupModal(false); setBackupPassword(''); setBackupConfirm(''); setBackupFile(null); setBackupError(''); setBackupSuccess(''); }}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                {backupSuccess ? 'Close' : 'Cancel'}
              </button>
              {!backupSuccess && (
                <button
                  type="button"
                  disabled={backupWorking || !backupPassword || (backupMode === 'export' ? !backupConfirm : !backupFile)}
                  onClick={backupMode === 'export' ? handleExportBackup : handleImportBackup}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onMouseDown={closeDeleteModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-2xl border border-neutral-100 dark:border-neutral-700 w-full max-w-md z-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Delete Account
              </h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
              This action is{' '}
              <strong className="text-neutral-900 dark:text-neutral-200">
                permanent and cannot be undone
              </strong>
              . All your data, pet profiles, and settings will be permanently deleted.
            </p>
            <label
              htmlFor="deleteConfirm"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
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
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors mb-3"
              placeholder={user?.email || ''}
            />
            {deleteError && (
              <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg mb-3">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteEmailInput !== user?.email || deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        shape={avatarShape}
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
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-3 rounded-2xl font-semibold shadow-xl transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
