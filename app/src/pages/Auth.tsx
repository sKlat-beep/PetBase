import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, appleProvider, isConfigMissing } from '../lib/firebase';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const reason = new URLSearchParams(window.location.search).get('reason');

  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isConfigMissing) {
      setError('Firebase configuration is missing. Please add your credentials to the environment variables.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');

    if (isConfigMissing) {
      setError('Firebase configuration is missing. Please add your credentials to the environment variables.');
      return;
    }

    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setError('');

    if (isConfigMissing) {
      setError('Firebase configuration is missing. Please add your credentials to the environment variables.');
      return;
    }

    setLoading(true);
    try {
      await signInWithPopup(auth, appleProvider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during Apple authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isConfigMissing) {
      setError('Firebase configuration is missing.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Could not send reset email. Check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary-container/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-tertiary/20 blur-[120px]" />
      </div>

      {/* Logo + Header */}
      <div className="relative z-10 text-center mb-8">
        <div className="flex justify-center mb-4">
          <span className="material-symbols-outlined text-primary-container" style={{ fontSize: 48 }}>
            pets
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>
          PetBase
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Your pet's digital home
        </p>
      </div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card p-8">
          {/* Login / Signup pill toggle */}
          <div className="flex bg-surface-container rounded-2xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all motion-safe:active:scale-[0.97] ${
                isLogin
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all motion-safe:active:scale-[0.97] ${
                !isLogin
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Session expired notice */}
          {reason === 'session_expired' && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-secondary-container/20 border border-secondary/30 p-3">
              <span className="material-symbols-outlined text-secondary text-lg">schedule</span>
              <p className="text-sm text-on-surface-variant">
                Your session expired. Please sign in again.
              </p>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-container/20 border-l-4 border-error p-3">
              <span className="material-symbols-outlined text-error text-lg mt-0.5">error</span>
              <p className="text-sm text-on-surface-variant">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleEmailAuth}>
            {/* Display Name (signup only) */}
            {!isLogin && (
              <div>
                <label htmlFor="display-name" className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                    person
                  </span>
                  <input
                    id="display-name"
                    name="displayName"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container text-sm transition-all"
                    placeholder="Alex Johnson"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                  mail
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container text-sm transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary-container hover:text-primary-fixed-dim transition-colors motion-safe:active:scale-[0.97]"
                    onClick={() => { setForgotMode(true); setResetEmail(email); setResetSent(false); setError(''); }}
                  >
                    FORGOT?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container text-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors motion-safe:active:scale-[0.97]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary-container text-on-primary-container font-semibold text-sm tracking-wide hover:opacity-90 focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 flex items-center justify-center gap-2 motion-safe:active:scale-[0.97]"
            >
              {loading && (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              )}
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-transparent text-xs font-medium text-on-surface-variant uppercase tracking-widest backdrop-blur-sm">
                Or continue with
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-medium transition-all disabled:opacity-50 motion-safe:active:scale-[0.97]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>

            <button
              onClick={handleAppleAuth}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-medium transition-all disabled:opacity-50 motion-safe:active:scale-[0.97]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </div>

          {/* Terms footer */}
          <p className="mt-6 text-center text-xs text-on-surface-variant/60">
            By continuing, you agree to PetBase's{' '}
            <button type="button" className="text-primary-container hover:underline motion-safe:active:scale-[0.97]">Terms of Service</button>
            {' '}and{' '}
            <button type="button" className="text-primary-container hover:underline motion-safe:active:scale-[0.97]">Privacy Policy</button>
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Overlay */}
      {forgotMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 w-full max-w-md"
          >
            <div className="text-center mb-6">
              <span className="material-symbols-outlined text-primary-container mb-3 block" style={{ fontSize: 40 }}>
                lock_reset
              </span>
              <h2 className="text-xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
                Reset Password
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                {resetSent
                  ? 'Check your inbox for a reset link.'
                  : "Enter your email and we'll send a reset link."}
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-container/20 border-l-4 border-error p-3">
                <span className="material-symbols-outlined text-error text-lg mt-0.5">error</span>
                <p className="text-sm text-on-surface-variant">{error}</p>
              </div>
            )}

            {resetSent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-secondary-container/20 border border-secondary/30 p-3">
                  <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                  <p className="text-sm text-on-surface-variant">
                    Reset email sent to <strong className="text-on-surface">{resetEmail}</strong>
                  </p>
                </div>
                <button
                  onClick={() => { setForgotMode(false); setResetSent(false); setError(''); }}
                  className="w-full py-3 rounded-xl bg-primary-container text-on-primary-container font-semibold text-sm tracking-wide hover:opacity-90 transition-all motion-safe:active:scale-[0.97]"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      mail
                    </span>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      autoFocus
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container text-sm transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-primary-container text-on-primary-container font-semibold text-sm tracking-wide hover:opacity-90 focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 flex items-center justify-center gap-2 motion-safe:active:scale-[0.97]"
                >
                  {loading && (
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  )}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setError(''); }}
                  className="w-full py-2.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors motion-safe:active:scale-[0.97]"
                >
                  Back to Login
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Decorative pet preview cards (purely visual) */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4 opacity-[0.08]">
        <div className="w-32 h-44 rounded-2xl bg-surface-container-high -rotate-12 translate-y-8" />
        <div className="w-32 h-44 rounded-2xl bg-surface-container-high translate-y-4" />
        <div className="w-32 h-44 rounded-2xl bg-surface-container-high rotate-12 translate-y-8" />
      </div>
    </div>
  );
}
