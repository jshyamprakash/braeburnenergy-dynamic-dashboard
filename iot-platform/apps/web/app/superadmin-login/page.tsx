'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/store';
import { updateTokens, updateUser } from '@/lib/store/slices/authSlice';
import { apiClient } from '@/lib/api-client';
import { signChallenge } from '@/lib/crypto/derive-keypair';
import forge from 'node-forge';
import { toast } from 'sonner';

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

    if (!privateKey) {
      toast.error('Please select a valid private key file');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Get challenge
      const challengeRes = await apiClient.get<{
        challengeId: string;
        challenge: string;
        expiresAt: string;
      }>('/auth/superadmin/challenge');

      const { challengeId, challenge } = challengeRes.data;

      // Step 2: Sign challenge with uploaded private key
      const signature = signChallenge(privateKey, challenge);

      // Step 3: Submit signature
      const loginRes = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; username: string; email: string; role: string };
      }>('/auth/superadmin/login', { challengeId, signature });

      const { accessToken, refreshToken, user: userData } = loginRes.data;

      dispatch(updateTokens({ accessToken, refreshToken }));
      dispatch(
        updateUser({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role as 'SuperAdmin' | 'Admin' | 'Operator' | 'Viewer',
        })
      );

      toast.success('SuperAdmin login successful!');
      router.push('/');
    } catch (err: any) {
      const errorMessage =
        err.response?.status === 401
          ? 'Login failed — key file does not match the stored public key'
          : err.message || 'Login failed';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            SuperAdmin Login
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Upload your private key file to continue
          </p>
        </div>

        {/* Login Form */}
        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Private Key File
              </label>
              <div className={`relative rounded-lg border-2 border-dashed transition-colors ${
                privateKey
                  ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/20'
                  : fileError
                  ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              } p-6 text-center`}>
                <input
                  type="file"
                  accept=".pem,.key"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {privateKey ? (
                  <div className="space-y-1">
                    <svg className="mx-auto h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{fileName}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">Key loaded — click to change</p>
                  </div>
                ) : fileError ? (
                  <div className="space-y-1">
                    <svg className="mx-auto h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>
                    <p className="text-xs text-gray-500">Click to try another file</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click or drag to upload <span className="font-medium">.pem</span> or <span className="font-medium">.key</span> file
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Generate with: <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">license-cli export-private-key</code>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !privateKey}
              className="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Login with Key File'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Not SuperAdmin?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Back to login
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
