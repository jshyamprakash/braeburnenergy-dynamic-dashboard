'use client';

import { useEffect } from 'react';
import {
  useAppDispatch,
  useAppSelector,
} from '@/lib/store';
import {
  fetchLicense,
  selectLicenseModules,
  selectLicenseStatus,
  selectLicenseValid,
  isModuleEnabled as isModuleEnabledHelper,
} from '@/lib/store/slices/licenseSlice';

/**
 * useLicense — React hook for license state management.
 * Automatically fetches license on mount if status is 'idle'.
 *
 * Returns:
 * - modules: array of enabled module keys (e.g., ['combustion_dl', 'be_agent'])
 * - isModuleEnabled: (key: string) => boolean helper function
 * - valid: boolean indicating if license is valid
 * - status: 'idle' | 'loading' | 'loaded' | 'error'
 */
export function useLicense() {
  const dispatch = useAppDispatch();
  const modules = useAppSelector(selectLicenseModules);
  const status = useAppSelector(selectLicenseStatus);
  const valid = useAppSelector(selectLicenseValid);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchLicense());
    }
  }, [status, dispatch]);

  return {
    modules,
    isModuleEnabled: (key: string) => isModuleEnabledHelper(modules, key),
    valid,
    status,
  };
}
