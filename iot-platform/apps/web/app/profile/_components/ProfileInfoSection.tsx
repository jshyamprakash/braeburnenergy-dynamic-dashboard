'use client';

import { useAppSelector } from '@/lib/store';
import { selectUserProfile } from '@/lib/store/slices/userSlice';

export function ProfileInfoSection() {
  const profile = useAppSelector(selectUserProfile);

  if (!profile) return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 text-xl font-semibold">Profile Information</h2>
      <div className="flex items-start gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-200">
            {profile.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
            <p className="font-semibold">{profile.username}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-semibold">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
              <p>
                <span className="inline-block px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-semibold">
                  {profile.role}
                </span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
              <p className="text-sm">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            {profile.lastLogin && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Login</p>
                <p className="text-sm">
                  {new Date(profile.lastLogin).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
