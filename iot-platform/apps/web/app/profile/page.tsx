'use client';

import { useAppDispatch, useAppSelector } from '@/lib/store';
import { fetchProfileData, selectUserStatus } from '@/lib/store/slices/userSlice';
import { selectUser } from '@/lib/store/slices/authSlice';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { ProfileInfoSection } from './_components/ProfileInfoSection';
import { ChangePasswordSection } from './_components/ChangePasswordSection';
import { ActiveSessionsSection } from './_components/ActiveSessionsSection';
import { ApiKeysSection } from './_components/ApiKeysSection';
import { RecoverySetupSection } from './_components/RecoverySetupSection';

function ProfileContent() {
  const dispatch = useAppDispatch();
  const userStatus = useAppSelector(selectUserStatus);
  const user = useAppSelector(selectUser);
  const loading = userStatus === 'loading' || userStatus === 'idle';

  useEffect(() => {
    dispatch(fetchProfileData()).catch(() => toast.error('Failed to load profile'));
  }, [dispatch]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your account, password, and active sessions
        </p>
      </div>

      {user?.mustChangePassword && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">Password change required</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
              You must change your temporary password before accessing the platform.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading profile...</div>
      ) : (
        <>
          <ProfileInfoSection />
          <ChangePasswordSection />
          <RecoverySetupSection />
          <ActiveSessionsSection />
          <ApiKeysSection />
        </>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <ProfileContent />
      </div>
    </div>
  );
}
