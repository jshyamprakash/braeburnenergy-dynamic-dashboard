'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/lib/store';
import { fetchLicense } from '@/lib/store/slices/licenseSlice';

/**
 * RootInitializer — initializes global app state on mount.
 * Currently dispatches fetchLicense to load module license info.
 */
export function RootInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchLicense());
  }, [dispatch]);

  return null; // No UI
}
