'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppSelector } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { toast } from 'sonner';
import { Eye, EyeOff, Cpu } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, error, clearError } = useAuth();
  const user = useAppSelector(selectUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(user.role === 'Viewer' ? '/viewer' : '/');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => { return () => { clearError(); }; }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { toast.error('Username is required'); return; }
    if (!password) { toast.error('Password is required'); return; }
    setIsSubmitting(true);
    clearError();
    try {
      const result = await login(username.trim(), password);
      toast.success('Login successful!');
      router.push(result.user.role === 'Viewer' ? '/viewer' : '/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (decorative) — hidden on mobile ── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative bg-slate-900 flex-col justify-between p-10 overflow-hidden">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Radial glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 60%)' }} />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">IoT Platform</span>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 ml-1 border border-slate-700 rounded px-1.5 py-0.5">POC</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Industrial-grade<br />
            monitoring & control
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Real-time device telemetry, ISA-18.2 alarm management, visual workflow automation — unified for enterprise operations.
          </p>
        </div>

        {/* Demo credentials card */}
        <div className="relative z-10">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4 max-w-xs">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-3">Demo Credentials</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Username</span>
                <span className="font-mono text-xs text-slate-200 bg-slate-900/60 px-2 py-0.5 rounded">admin</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Password</span>
                <span className="font-mono text-xs text-slate-200 bg-slate-900/60 px-2 py-0.5 rounded">Admin123!</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 bg-white dark:bg-slate-950 min-h-screen">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">IoT Platform</span>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your credentials to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 p-3 flex items-start gap-3">
              <svg className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-rose-700 dark:text-rose-300 flex-1">{error}</p>
              <button onClick={clearError} className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-colors"
                placeholder="Enter your username"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                onClick={() => router.push('/recovery')}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Mobile demo credentials */}
          <div className="lg:hidden mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-2">Demo</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Username: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">admin</span></p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Password: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">Admin123!</span></p>
          </div>

          {/* SuperAdmin link */}
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            SuperAdmin?{' '}
            <button
              onClick={() => router.push('/superadmin-login')}
              className="font-medium text-rose-600 hover:text-rose-500 dark:text-rose-400"
            >
              Login here →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
