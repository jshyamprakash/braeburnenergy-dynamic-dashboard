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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 flex items-center justify-center">
        <div className="text-slate-400 dark:text-slate-500">Loading modules...</div>
      </div>
    );
  }

  // Non-SuperAdmin should never reach here (redirected above), but safety check
  if (!user || user.role !== 'SuperAdmin') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 flex items-center justify-center">
        <div className="text-red-500 dark:text-red-400">
          Access denied. SuperAdmin role required.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Module Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                className={`rounded-xl border p-5 transition-all duration-200 ${
                  isEnabled
                    ? 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 opacity-80'
                }`}
              >
                {/* Icon strip */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    isEnabled ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <Shield className={`w-5 h-5 ${isEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggle(moduleKey)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                      isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    aria-label={`Toggle ${config.name}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isEnabled ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{config.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{config.description}</p>

                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                  isEnabled
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {isEnabled
                    ? <><Check className="w-3.5 h-3.5" />Enabled</>
                    : <><X className="w-3.5 h-3.5" />Disabled</>
                  }
                </span>
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
            className="px-6 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || mutation.isPending}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
            Failed to load module configuration. Please try again.
          </div>
        )}
    </div>
  );
}
