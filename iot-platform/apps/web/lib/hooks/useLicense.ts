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
  isModuleEnabled as isModuleEnabledHelper,
} from '@/lib/store/slices/licenseSlice';

/**
 * useLicense — React hook for module state management (ADR-051).
 * Automatically fetches enabled modules from GET /api/v1/modules on mount if status is 'idle'.
 *
 * Returns:
 * - modules: array of enabled module keys (e.g., ['combustion_dl', 'be_agent'])
 * - isModuleEnabled: (key: string) => boolean helper function
 * - status: 'idle' | 'loading' | 'loaded' | 'error'
 */
export function useLicense() {
  const dispatch = useAppDispatch();
  const modules = useAppSelector(selectLicenseModules);
  const status = useAppSelector(selectLicenseStatus);

  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      dispatch(fetchLicense());
    }
  }, [status, dispatch]);

  return {
    modules,
    isModuleEnabled: (key: string) => isModuleEnabledHelper(modules, key),
    status,
  };
}
