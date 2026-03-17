import { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { unwrapVaultKey, type VaultKeyDoc } from '../lib/crypto';

interface VaultUnlockModalProps {
  vaultDoc: VaultKeyDoc;
  uid: string;
  onUnlocked: () => void;
}

/**
 * Shown when the user signs in on a new device that has no local encryption key,
 * but a vault key exists in Firestore (cross-device sync was previously set up).
 * The user enters their sync password to unwrap the AES key and gain access to
 * all encrypted data (medical records, expenses, notes).
 */
export function VaultUnlockModal({ vaultDoc, uid, onUnlocked }: VaultUnlockModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async () => {
    if (!password) return;
    setWorking(true);
    setError('');
    try {
      await unwrapVaultKey(vaultDoc, password, uid);
      onUnlocked();
    } catch (err: any) {
      setError(err.message || 'Incorrect sync password. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-unlock-modal-title"
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-neutral-100 dark:border-neutral-700 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 id="vault-unlock-modal-title" className="font-semibold text-neutral-900 dark:text-neutral-100">Unlock Encrypted Data</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">New device detected</p>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Your encrypted data (medical records, expenses, pet notes) is synced to this account.
          Enter your <span className="font-medium text-neutral-800 dark:text-neutral-200">sync password</span> to
          restore access on this device.
        </p>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Sync Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter your sync password"
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
            {error}
          </p>
        )}

        <button
          onClick={handleUnlock}
          disabled={!password || working}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {working && <RefreshCw className="w-4 h-4 animate-spin" />}
          {working ? 'Unlocking…' : 'Unlock & Sync Data'}
        </button>

        <p className="text-xs text-center text-neutral-400 dark:text-neutral-500">
          Forgot your sync password? Your data is safe in the cloud but cannot be decrypted without it.
          You can reset sync in <span className="font-medium">Settings → Data → Cross-Device Sync</span>.
        </p>
      </motion.div>
    </div>
  );
}
