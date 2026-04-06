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
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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
            className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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
        className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
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
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="Enter your username"
            required
          />
        </div>
        <button type="submit" disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
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
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 space-y-3">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
          Step 1: Share these with your SuperAdmin
        </p>
        <div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
            Short token (read over phone — confirms you share the same challenge):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 px-3 py-2 font-mono text-lg font-bold text-blue-900 dark:text-blue-200 tracking-[0.3em]">
              {challengeData!.recoveryToken}
            </code>
            <button type="button" onClick={() => copyText(challengeData!.recoveryToken, 'token')}
              className="p-2 rounded border border-blue-300 dark:border-blue-700 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              {copied === 'token' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
            Full challenge hex (SA pastes into CLI):
          </p>
          <div className="flex items-start gap-2">
            <code className="flex-1 rounded bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 px-3 py-2 font-mono text-xs text-blue-900 dark:text-blue-300 break-all">
              {challengeData!.challenge}
            </code>
            <button type="button" onClick={() => copyText(challengeData!.challenge, 'challenge')}
              className="p-2 rounded border border-blue-300 dark:border-blue-700 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex-shrink-0">
              {copied === 'challenge' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="text-xs text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded p-2 font-mono">
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
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-xs font-mono focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none"
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
            className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="Choose a new password"
            required
            minLength={8}
          />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Min 8 chars, uppercase, lowercase, number, special character.
        </p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => { setSAStep('username'); setChallengeData(null); setSignature(''); }}
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Start Over
        </button>
        <button type="submit" disabled={isSubmitting || !signature.trim() || !newPassword}
          className="flex-2 flex-grow flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Password Reset</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your password has been reset. You must change it on next login.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg sm:px-10 space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-300">
              New password: <strong className="font-mono break-all">{newPassword}</strong>
            </p>
          </div>
          <button onClick={async () => {
            await navigator.clipboard.writeText(newPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Password'}
          </button>
          <button onClick={onLogin}
            className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Account Recovery</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Reset your password using a recovery method below
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
          {/* Tab toggle */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {([
              { key: 'self', label: 'Recovery Passphrase' },
              { key: 'sa',   label: 'SuperAdmin Recovery' },
            ] as const).map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="py-6 px-6 sm:px-8">
            {activeTab === 'self'
              ? <SelfServiceRecovery onSuccess={setSuccessPassword} />
              : <SARecovery onSuccess={setSuccessPassword} />
            }
          </div>

          <div className="pb-6 text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <button onClick={() => router.push('/login')}
                className="text-blue-600 dark:text-blue-400 hover:underline">
                Back to login
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
