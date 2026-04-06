'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import type { RootState } from '@/lib/store';
import { useLicense } from '@/lib/hooks/useLicense';
import { useModuleConfig } from '@/lib/hooks/useModuleConfig';
import { fetchLicense } from '@/lib/store/slices/licenseSlice';
import { toast } from 'sonner';
import { Shield, Check, X } from 'lucide-react';
import type { LicenseModule } from '@repo/types';

const MODULE_CONFIGS: Record<LicenseModule, { name: string; description: string }> = {
  combustion_dl: {
    name: 'Combustion DL (Precursor)',
    description: 'Combustion engine diagnostics and predictive learning capabilities',
  },
  asset_life: {
    name: 'Asset Life Management',
    description: 'Fleet analytics and IBM Maximo integration for asset lifecycle management',
  },
  be_agent: {
    name: 'BE Agent',
    description: 'Business Execution Agent with intelligent workflow automation',
  },
};

export default function ModulesPage() {
  const router = useRouter();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const dispatch = useAppDispatch();
  const { modules: enabledModules, status } = useLicense();
  const mutation = useModuleConfig();

  const [localEnabled, setLocalEnabled] = useState<LicenseModule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Gate: redirect non-SuperAdmin
  useEffect(() => {
    if (user && user.role !== 'SuperAdmin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Initialize local state from slice
  useEffect(() => {
    setLocalEnabled(enabledModules);
    setHasChanges(false);
  }, [enabledModules]);

  const handleToggle = (module: LicenseModule) => {
    setLocalEnabled((prev) => {
      const next = prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module];
      setHasChanges(JSON.stringify(next) !== JSON.stringify(enabledModules));
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({ enabled: localEnabled });
      toast.success('Module configuration updated');
      // Refresh licenseSlice to sync state
      dispatch(fetchLicense());
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update modules');
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading modules...</div>
      </div>
    );
  }

  // Non-SuperAdmin should never reach here (redirected above), but safety check
  if (!user || user.role !== 'SuperAdmin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 flex items-center justify-center">
        <div className="text-red-500 dark:text-red-400">
          Access denied. SuperAdmin role required.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Module Management
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Enable or disable optional modules for this deployment
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {(Object.keys(MODULE_CONFIGS) as LicenseModule[]).map((moduleKey) => {
            const config = MODULE_CONFIGS[moduleKey];
            const isEnabled = localEnabled.includes(moduleKey);

            return (
              <div
                key={moduleKey}
                className={`p-4 border rounded-lg transition-colors ${
                  isEnabled
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                }`}
              >
                {/* Module header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {config.name}
                    </h3>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggle(moduleKey)}
                    className={`relative ml-3 w-14 h-8 rounded-full transition-colors ${
                      isEnabled
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={`Toggle ${config.name}`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                        isEnabled ? 'translate-x-6' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Module description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {config.description}
                </p>

                {/* Status badge */}
                <div className="flex items-center gap-2 text-xs font-medium">
                  {isEnabled ? (
                    <>
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">Enabled</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-400 dark:text-gray-500">Disabled</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setLocalEnabled(enabledModules);
              setHasChanges(false);
            }}
            disabled={!hasChanges || mutation.isPending}
            className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || mutation.isPending}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        {/* Error message */}
        {status === 'error' && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            Failed to load module configuration. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
