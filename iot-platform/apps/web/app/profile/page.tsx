'use client';

import { useAppDispatch, useAppSelector } from '@/lib/store';
import { fetchProfileData, selectUserStatus } from '@/lib/store/slices/userSlice';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ProfileInfoSection } from './_components/ProfileInfoSection';
import { ChangePasswordSection } from './_components/ChangePasswordSection';
import { ActiveSessionsSection } from './_components/ActiveSessionsSection';

function ProfileContent() {
  const dispatch = useAppDispatch();
  const userStatus = useAppSelector(selectUserStatus);
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

      {loading ? (
        <div className="text-center py-8">Loading profile...</div>
      ) : (
        <>
          <ProfileInfoSection />
          <ChangePasswordSection />
          <ActiveSessionsSection />
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
