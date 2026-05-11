'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useChangePassword } from '@/lib/hooks/useProfile';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { fetchSessions } from '@/lib/store/slices/userSlice';
import { selectUser, updateUser } from '@/lib/store/slices/authSlice';
import { toast } from 'sonner';

function validatePassword(password: string): {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
} {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = validatePassword(password);
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const strength = Math.round((passedChecks / 5) * 100);

  const color =
    strength < 40 ? 'bg-red-500' : strength < 80 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`${color} transition-all`} style={{ width: `${strength}%` }} />
      </div>
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className={checks.length ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.length ? '✓' : '○'} At least 8 characters
        </div>
        <div className={checks.uppercase ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.uppercase ? '✓' : '○'} Uppercase letter
        </div>
        <div className={checks.lowercase ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.lowercase ? '✓' : '○'} Lowercase letter
        </div>
        <div className={checks.number ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.number ? '✓' : '○'} Number
        </div>
        <div className={checks.special ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.special ? '✓' : '○'} Special character
        </div>
      </div>
    </div>
  );
}

export function ChangePasswordSection() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const changePassword = useChangePassword();
  const passwordLoading = changePassword.isPending;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    const checks = validatePassword(newPassword);
    if (!Object.values(checks).every(Boolean)) {
      toast.error('Password does not meet strength requirements');
      return;
    }

    try {
      const wasForced = user?.mustChangePassword;
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      dispatch(updateUser({ mustChangePassword: false }));
      dispatch(fetchSessions());
      if (wasForced) router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    }
  };

  const passwordChecks = validatePassword(newPassword);
  const passwordValid =
    Object.values(passwordChecks).every(Boolean) &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    currentPassword.length > 0;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Change Password</h2>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            placeholder="Enter current password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            placeholder="Enter new password"
          />
          {newPassword && <PasswordStrengthIndicator password={newPassword} />}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            placeholder="Confirm new password"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!passwordValid || passwordLoading}
          className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {passwordLoading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </section>
  );
}
