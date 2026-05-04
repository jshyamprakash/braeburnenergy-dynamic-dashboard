'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/store';
import { updateTokens, updateUser } from '@/lib/store/slices/authSlice';
import { apiClient } from '@/lib/api-client';
import { signChallenge } from '@/lib/crypto/derive-keypair';
import forge from 'node-forge';
import { toast } from 'sonner';
import { ShieldAlert, CheckCircle2, XCircle, Key } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateKey, setPrivateKey] = useState<forge.pki.PrivateKey | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    setPrivateKey(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      try {
        const key = forge.pki.privateKeyFromPem(content);
        setPrivateKey(key);
        setFileName(file.name);
      } catch {
        setFileError('Not a valid RSA private key PEM file.');
        setFileName('');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateKey) { toast.error('Please select a valid private key file'); return; }
    setIsSubmitting(true);
    try {
      const challengeRes = await apiClient.get<{ challengeId: string; challenge: string; expiresAt: string }>('/auth/superadmin/challenge');
      const { challengeId, challenge } = challengeRes.data;
      const signature = signChallenge(privateKey, challenge);
      const loginRes = await apiClient.post<{ accessToken: string; refreshToken: string; user: { id: string; username: string; email: string; role: string } }>('/auth/superadmin/login', { challengeId, signature });
      const { accessToken, refreshToken, user: userData } = loginRes.data;
      dispatch(updateTokens({ accessToken, refreshToken }));
      dispatch(updateUser({ id: userData.id, username: userData.username, email: userData.email, role: userData.role as any }));
      toast.success('SuperAdmin login successful!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.status === 401 ? 'Login failed — key file does not match the stored public key' : err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — rose-tinted to signal elevated privilege ── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative flex-col justify-between p-10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1c0a0a 0%, #0f172a 100%)' }}>
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.12) 0%, transparent 60%)' }} />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">IoT Platform</span>
          <span className="text-[10px] uppercase tracking-widest text-rose-400 ml-1 border border-rose-800 rounded px-1.5 py-0.5">SuperAdmin</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Privileged access<br />
            requires key authentication
          </h2>
          <p className="text-rose-300/70 text-sm leading-relaxed max-w-sm">
            SuperAdmin login uses RSA private key challenge-response authentication. Upload your key file to proceed.
          </p>
        </div>

        {/* Warning card */}
        <div className="relative z-10">
          <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 backdrop-blur p-4 max-w-xs">
            <p className="text-[10px] uppercase tracking-widest text-rose-500 font-medium mb-2">Security Notice</p>
            <p className="text-xs text-rose-300/80 leading-relaxed">
              This session is audited. All actions taken as SuperAdmin are recorded in the immutable audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 bg-white dark:bg-slate-950 min-h-screen">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">SuperAdmin Login</span>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Privileged Sign-in</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload your RSA private key file to authenticate</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Private Key File
              </label>
              <div className={`relative rounded-xl border-2 border-dashed transition-all duration-150 ${
                privateKey
                  ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
                  : fileError
                  ? 'border-rose-400 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
              } p-6 text-center`}>
                <input
                  type="file"
                  accept=".pem,.key"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {privateKey ? (
                  <div className="space-y-1 pointer-events-none">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{fileName}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">Key loaded · click to change</p>
                  </div>
                ) : fileError ? (
                  <div className="space-y-1 pointer-events-none">
                    <XCircle className="mx-auto h-8 w-8 text-rose-500" />
                    <p className="text-sm text-rose-600 dark:text-rose-400">{fileError}</p>
                    <p className="text-xs text-slate-500">Click to try another file</p>
                  </div>
                ) : (
                  <div className="space-y-1 pointer-events-none">
                    <Key className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Click or drag to upload <span className="font-medium">.pem</span> or <span className="font-medium">.key</span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Generate with: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">license-cli export-private-key</code>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !privateKey}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSubmitting ? 'Verifying…' : 'Login with Key File'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Not SuperAdmin?{' '}
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
