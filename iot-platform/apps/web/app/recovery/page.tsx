'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { deriveKeyPair, signChallenge } from '@/lib/crypto/derive-keypair';
import { toast } from 'sonner';
import { Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';

// ── Password strength (mirrors ChangePasswordSection) ─────────────────────────

function validatePassword(password: string) {
  return {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /\d/.test(password),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

// ── Self-Service Recovery (existing ADR-052 flow) ─────────────────────────────

function SelfServiceRecovery({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [userId, setUserId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !passphrase.trim()) {
      toast.error('All fields are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const challengeRes = await apiClient.get<{
        challengeId: string; challenge: string;
      }>(`/auth/recovery/challenge?userId=${encodeURIComponent(userId.trim())}`);

      const { challengeId, challenge } = challengeRes.data;
      const { privateKey } = await deriveKeyPair(passphrase.trim());
      const signature = signChallenge(privateKey, challenge);

      const tempPassword = `Temp${Math.random().toString(36).slice(2, 8)}!`;
      await apiClient.post('/auth/recovery/redeem', {
        userId: userId.trim(), challengeId, signature, newPassword: tempPassword,
      });

      onSuccess(tempPassword);
    } catch (err: any) {
      toast.error(
        err.response?.status === 401
          ? 'Incorrect passphrase or invalid user'
          : err.message || 'Recovery failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          User ID (MongoDB ObjectId)
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={isSubmitting}
          className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          placeholder="e.g. 6789abcd..."
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Recovery Passphrase
        </label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            disabled={isSubmitting}
            className="appearance-none block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            placeholder="Enter your recovery passphrase"
            required
          />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {isSubmitting ? (
          <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Resetting...</>
        ) : 'Reset Password'}
      </button>
    </form>
  );
}

// ── SA-Authorized Recovery (ADR-054) ──────────────────────────────────────────

interface SAChallenge {
  userId: string;
  challengeId: string;
  challenge: string;
  recoveryToken: string;
}

function SARecovery({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [saStep, setSAStep] = useState<'username' | 'challenge'>('username');
  const [username, setUsername] = useState('');
  const [challengeData, setChallengeData] = useState<SAChallenge | null>(null);
  const [signature, setSignature] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<'token' | 'challenge' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGetChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { toast.error('Username is required'); return; }
    setIsLoading(true);
    try {
      const res = await apiClient.get<SAChallenge>(
        `/auth/recovery/sa-challenge?username=${encodeURIComponent(username.trim())}`
      );
      setChallengeData(res.data);
      setSAStep('challenge');
    } catch (err: any) {
      toast.error(err.response?.status === 404 ? 'No account found with that username' : err.message || 'Failed to get challenge');
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = async (text: string, which: 'token' | 'challenge') => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeData || !signature.trim() || !newPassword) {
      toast.error('All fields are required');
      return;
    }
    const checks = validatePassword(newPassword);
    if (!Object.values(checks).every(Boolean)) {
      toast.error('Password does not meet strength requirements');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/recovery/sa-redeem', {
        userId:      challengeData.userId,
        challengeId: challengeData.challengeId,
        signature:   signature.trim(),
        newPassword,
      });
      onSuccess(newPassword);
    } catch (err: any) {
      toast.error(
        err.response?.status === 400
          ? 'Invalid or expired response string — request a new challenge'
          : err.message || 'Recovery failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (saStep === 'username') {
    return (
      <form className="space-y-4" onSubmit={handleGetChallenge}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Your Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            placeholder="Enter your username"
            required
          />
        </div>
        <button type="submit" disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {isLoading ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Generating...</>
          ) : 'Generate Challenge'}
        </button>
      </form>
    );
  }

  // Step 2: show challenge, collect SA response + new password
  return (
    <form className="space-y-5" onSubmit={handleRedeem}>
      {/* Recovery Token */}
      <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-blue-200 dark:border-blue-800 p-4 space-y-3">
        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
          Step 1: Share these with your SuperAdmin
        </p>
        <div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
            Short token (read over phone — confirms you share the same challenge):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 px-3 py-2 font-mono text-lg font-bold text-blue-900 dark:text-blue-200 tracking-[0.3em]">
              {challengeData!.recoveryToken}
            </code>
            <button type="button" onClick={() => copyText(challengeData!.recoveryToken, 'token')}
              className="p-2 rounded border border-blue-300 dark:border-blue-700 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-blue-900/50 transition-colors">
              {copied === 'token' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
            Full challenge hex (SA pastes into CLI):
          </p>
          <div className="flex items-start gap-2">
            <code className="flex-1 rounded bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 px-3 py-2 font-mono text-xs text-blue-900 dark:text-indigo-300 break-all">
              {challengeData!.challenge}
            </code>
            <button type="button" onClick={() => copyText(challengeData!.challenge, 'challenge')}
              className="p-2 rounded border border-blue-300 dark:border-blue-700 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0">
              {copied === 'challenge' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded p-2 font-mono">
          SA runs: license-cli sa-recovery-sign --challenge &lt;hex&gt; --private-key sa.pem
        </div>
      </div>

      {/* Response String from SA */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Step 2: Enter Response String from SuperAdmin
        </label>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          rows={4}
          disabled={isSubmitting}
          className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white text-xs font-mono focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 resize-none"
          placeholder="Paste the response string given by SuperAdmin..."
          required
        />
      </div>

      {/* New Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Step 3: Set New Password
        </label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isSubmitting}
            className="appearance-none block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            placeholder="Choose a new password"
            required
            minLength={8}
          />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Min 8 chars, uppercase, lowercase, number, special character.
        </p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => { setSAStep('username'); setChallengeData(null); setSignature(''); }}
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
          Start Over
        </button>
        <button type="submit" disabled={isSubmitting || !signature.trim() || !newPassword}
          className="flex-2 flex-grow flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {isSubmitting ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Resetting...</>
          ) : 'Reset Password'}
        </button>
      </div>
    </form>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────

function SuccessScreen({ newPassword, onLogin }: { newPassword: string; onLogin: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Password Reset</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your password has been reset. You must change it on next login.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-3">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1 font-medium">Your new temporary password</p>
            <p className="font-mono text-sm text-emerald-800 dark:text-emerald-200 break-all font-semibold">{newPassword}</p>
          </div>
          <button onClick={async () => { await navigator.clipboard.writeText(newPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Password'}
          </button>
          <button onClick={onLogin}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RecoveryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'self' | 'sa'>('self');
  const [successPassword, setSuccessPassword] = useState<string | null>(null);

  if (successPassword) {
    return <SuccessScreen newPassword={successPassword} onLogin={() => router.push('/login')} />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative bg-slate-900 flex-col justify-between p-10 overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 60%)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg">IoT Platform</span>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-bold text-white leading-tight">Account Recovery</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Recover access to your account using your recovery passphrase or with assistance from a SuperAdmin.
          </p>
        </div>

        <div className="relative z-10">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4 max-w-xs">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-2">Two methods available</p>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p>① Self-service via recovery passphrase</p>
              <p>② SuperAdmin-assisted challenge-response</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 bg-white dark:bg-slate-950 min-h-screen">
        <div className="max-w-sm w-full mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account Recovery</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reset your password using a recovery method below</p>
          </div>

          {/* Pill tab switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-6 gap-1">
            {([
              { key: 'self', label: 'Passphrase' },
              { key: 'sa',   label: 'SuperAdmin' },
            ] as const).map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
                  activeTab === key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'self'
            ? <SelfServiceRecovery onSuccess={setSuccessPassword} />
            : <SARecovery onSuccess={setSuccessPassword} />
          }

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Remember your password?{' '}
            <button onClick={() => router.push('/login')}
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              Back to login →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
