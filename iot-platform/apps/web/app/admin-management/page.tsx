'use client';

import { useState } from 'react';
import { ShieldCheck, UserPlus, KeyRound, CheckCircle, Copy, AlertTriangle, RefreshCw, RotateCcw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminStatus, useCreateAdmin, useResetAdminPassword, useRotatePublicKey } from '@/lib/hooks/useAdminManagement';
import { useBeAgentConfig, useUpdateBeAgentConfig } from '@/lib/hooks/useBeAgentChat';

// ── One-time temp password reveal modal ──────────────────────────────────────

interface TempPasswordModalProps {
  password: string;
  username?: string;
  onClose: () => void;
}

function TempPasswordModal({ password, username, onClose }: TempPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-[var(--shadow-modal)] p-6 space-y-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="font-semibold">Save this password — it will not be shown again</p>
        </div>

        {username && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Account: <span className="font-medium text-slate-900 dark:text-white">{username}</span>
          </p>
        )}

        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-3 font-mono text-base tracking-widest text-slate-900 dark:text-white break-all">
          {password}
        </div>

        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>

        <button
          onClick={onClose}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
        >
          Done — I have saved the password
        </button>
      </div>
    </div>
  );
}

// ── Create Admin form ─────────────────────────────────────────────────────────

function CreateAdminForm({ onCreated }: { onCreated: (pw: string) => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const createMutation = useCreateAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createMutation.mutateAsync({ username: username.trim(), email: email.trim() });
      onCreated(result.tempPassword);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create admin account');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          minLength={3}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. admin"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. admin@company.com"
        />
      </div>
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        <UserPlus className="h-4 w-4" />
        {createMutation.isPending ? 'Creating...' : 'Create Admin Account'}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminManagementPage() {
  const { data: admin, isLoading } = useAdminStatus();
  const resetMutation = useResetAdminPassword();
  const rotateMutation = useRotatePublicKey();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [revealUsername, setRevealUsername] = useState<string | undefined>();
  const [newPublicKeyPem, setNewPublicKeyPem] = useState('');
  const [rotateSuccess, setRotateSuccess] = useState(false);

  // BE Agent config
  const { data: beAgentConfig } = useBeAgentConfig();
  const updateBeAgentMutation = useUpdateBeAgentConfig();
  const [beAgentEndpoint, setBeAgentEndpoint] = useState('');
  const [beAgentApiKey, setBeAgentApiKey] = useState('');
  const [beAgentModel, setBeAgentModel] = useState('gpt-4o-mini');
  const [beAgentUpdateSuccess, setBeAgentUpdateSuccess] = useState(false);

  const handleBeAgentUpdate = async () => {
    try {
      await updateBeAgentMutation.mutateAsync({
        endpoint: beAgentEndpoint || undefined,
        apiKey: beAgentApiKey || undefined,
        model: beAgentModel || undefined,
      });
      setBeAgentUpdateSuccess(true);
      setTimeout(() => setBeAgentUpdateSuccess(false), 3000);
      toast.success('BE Agent configuration updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update BE Agent config');
    }
  };

  const handleCreated = (pw: string) => {
    setRevealUsername(undefined);
    setTempPassword(pw);
  };

  const handleReset = async () => {
    try {
      const result = await resetMutation.mutateAsync();
      setRevealUsername(result.username);
      setTempPassword(result.tempPassword);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  const handleRotateKey = async () => {
    setRotateSuccess(false);
    try {
      await rotateMutation.mutateAsync({ publicKeyPem: newPublicKeyPem.trim() });
      setRotateSuccess(true);
      setNewPublicKeyPem('');
      toast.success('Public key rotated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to rotate public key');
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Account Management</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              Create and manage the primary customer Admin account
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : admin ? (
          /* ── Admin exists ── */
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Current Admin Account</h2>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <dt className="text-slate-400 dark:text-slate-500">Username</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{admin.username}</dd>

              <dt className="text-slate-400 dark:text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{admin.email}</dd>

              <dt className="text-slate-400 dark:text-slate-500">Status</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${admin.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {admin.isActive ? 'Active' : 'Inactive'}
                </span>
              </dd>

              <dt className="text-slate-400 dark:text-slate-500">Password</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${admin.mustChangePassword ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}`}>
                  {admin.mustChangePassword ? 'Temporary (not changed)' : 'Set by admin'}
                </span>
              </dd>

              {admin.lastLogin && (
                <>
                  <dt className="text-slate-400 dark:text-slate-500">Last login</dt>
                  <dd className="text-slate-900 dark:text-white">{new Date(admin.lastLogin).toLocaleString()}</dd>
                </>
              )}
            </dl>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleReset}
                disabled={resetMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
                {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </button>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                This generates a new temporary password. The admin will be required to change it on next login.
              </p>
            </div>
          </div>
        ) : (
          /* ── No admin yet ── */
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <KeyRound className="h-5 w-5" />
              <p className="text-sm">No Admin account exists. Create one to get started.</p>
            </div>
            <CreateAdminForm onCreated={handleCreated} />
          </div>
        )}

        {/* ── BE Agent AI Configuration (ADR-058) ── */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">BE Agent AI Configuration</h2>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                Configure OpenAI-compatible LLM endpoint for chat streaming
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm space-y-1">
            <p className="font-medium text-indigo-800 dark:text-indigo-300">Supported endpoints:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-indigo-700 dark:text-indigo-400 text-xs">
              <li><code className="font-mono bg-indigo-100 dark:bg-indigo-900/50 px-1 rounded">http://localhost:11434/v1</code> (Ollama)</li>
              <li><code className="font-mono bg-indigo-100 dark:bg-indigo-900/50 px-1 rounded">http://localhost:8000/v1</code> (vLLM)</li>
              <li><code className="font-mono bg-indigo-100 dark:bg-indigo-900/50 px-1 rounded">https://api.openai.com/v1</code> (OpenAI)</li>
              <li>Groq, Azure OpenAI, or any OpenAI-compatible endpoint</li>
              <li>Leave empty for stub mode (no external calls)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endpoint URL
              </label>
              <input
                type="text"
                value={beAgentEndpoint}
                onChange={(e) => setBeAgentEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {beAgentConfig?.endpoint && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Current: {beAgentConfig.endpoint}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key (optional)
              </label>
              <input
                type="password"
                value={beAgentApiKey}
                onChange={(e) => setBeAgentApiKey(e.target.value)}
                placeholder="Leave blank if not needed"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {beAgentConfig?.apiKeySet && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ API key is set
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model name
              </label>
              <input
                type="text"
                value={beAgentModel}
                onChange={(e) => setBeAgentModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {beAgentConfig?.model && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Current: {beAgentConfig.model}
                </p>
              )}
            </div>
          </div>

          {beAgentUpdateSuccess && (
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Configuration saved successfully
            </div>
          )}

          <button
            onClick={handleBeAgentUpdate}
            disabled={updateBeAgentMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-blue-950/50 disabled:opacity-50 transition-colors"
          >
            <Zap className={`h-4 w-4 ${updateBeAgentMutation.isPending ? 'animate-spin' : ''}`} />
            {updateBeAgentMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* ── SuperAdmin Key Rotation (ADR-053) ── */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">SuperAdmin Key Rotation</h2>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                Replace the login public key stored on this system.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">Before rotating:</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-700 dark:text-amber-400 text-xs">
              <li>Run <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">license-cli export-private-key --passphrase &lt;new&gt;</code> on your machine.</li>
              <li>Paste the matching public key PEM printed by that command below.</li>
              <li>Ensure you have the new <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.pem</code> file before clicking Rotate.</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Public Key PEM
            </label>
            <textarea
              value={newPublicKeyPem}
              onChange={(e) => { setNewPublicKeyPem(e.target.value); setRotateSuccess(false); }}
              rows={7}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              placeholder={'-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'}
              disabled={rotateMutation.isPending}
            />
          </div>

          {rotateSuccess && (
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Key rotated. Next login must use the matching private key file.
            </div>
          )}

          <button
            onClick={handleRotateKey}
            disabled={rotateMutation.isPending || !newPublicKeyPem.trim()}
            className="flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`h-4 w-4 ${rotateMutation.isPending ? 'animate-spin' : ''}`} />
            {rotateMutation.isPending ? 'Rotating...' : 'Rotate Public Key'}
          </button>
        </div>

      </div>

      {/* One-time temp password reveal */}
      {tempPassword && (
        <TempPasswordModal
          password={tempPassword}
          username={revealUsername}
          onClose={() => { setTempPassword(null); setRevealUsername(undefined); }}
        />
      )}
    </div>
  );
}
