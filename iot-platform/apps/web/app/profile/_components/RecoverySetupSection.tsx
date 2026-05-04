'use client';

import { useState } from 'react';
import { useAppSelector } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { apiClient } from '@/lib/api-client';
import { deriveKeyPair } from '@/lib/crypto/derive-keypair';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield } from 'lucide-react';

/**
 * Recovery Setup section for Admin role (ADR-052).
 * Allows Admin to derive and save their recovery public key.
 */
export function RecoverySetupSection() {
  const user = useAppSelector(selectUser);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Only show for Admin role
  if (!user || user.role !== 'Admin') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passphrase.trim()) {
      toast.error('Passphrase is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Derive keypair from passphrase
      const { publicKeyPem } = await deriveKeyPair(passphrase.trim());

      // Save public key to backend
      await apiClient.post('/api/v1/auth/recovery/setup', { publicKey: publicKeyPem });

      toast.success('Recovery key saved successfully');
      setPassphrase('');
      setIsConfigured(true);
      setTimeout(() => setIsConfigured(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save recovery key');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-indigo-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Recovery Key Setup
        </h2>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Set up your recovery key (ADR-052). This allows you to reset your password independently using a passphrase.
        Same passphrase as SuperAdmin keypair setup if coordinating with client.
      </p>

      {isConfigured && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-300">
            ✓ Recovery key configured
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="recovery-passphrase" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Recovery Passphrase
          </label>
          <div className="mt-1 relative">
            <input
              id="recovery-passphrase"
              type={showPassphrase ? 'text' : 'password'}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              disabled={isSubmitting}
              className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter a strong passphrase"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassphrase(!showPassphrase)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Your passphrase is never stored. Only the derived public key is saved.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Recovery Key'}
        </button>
      </form>
    </div>
  );
}
