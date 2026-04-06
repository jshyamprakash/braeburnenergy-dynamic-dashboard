import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api-client';
import type { ModuleConfig, LicenseModule } from '@repo/types';

/**
 * License state interface
 */
export interface LicenseState {
  enabled: LicenseModule[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
}

/**
 * Initial state
 */
const initialState: LicenseState = {
  enabled: [],
  status: 'idle',
  error: null,
};

/**
 * Async thunk: fetch modules from backend
 * Endpoint: GET /api/v1/modules → { enabled: LicenseModule[] }
 */
export const fetchLicense = createAsyncThunk(
  'license/fetchLicense',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ModuleConfig>('/api/v1/modules');
      return response.data;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Unknown error');
    }
  }
);

/**
 * License slice
 */
const licenseSlice = createSlice({
  name: 'license',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLicense.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchLicense.fulfilled, (state, action) => {
        state.status = 'loaded';
        state.enabled = action.payload.enabled;
        state.error = null;
      })
      .addCase(fetchLicense.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
        state.enabled = [];
      });
  },
});

/**
 * Export actions
 */
export const { clearError } = licenseSlice.actions;

/**
 * Export reducer
 */
export default licenseSlice.reducer;

/**
 * Selectors
 */
export const selectLicense = (state: { license: LicenseState }) => state.license;
export const selectLicenseModules = (state: { license: LicenseState }) =>
  state.license.enabled;
export const selectLicenseStatus = (state: { license: LicenseState }) =>
  state.license.status;

/**
 * Helper: check if a module is enabled
 */
export function isModuleEnabled(modules: LicenseModule[], key: string): boolean {
  return modules.includes(key as LicenseModule);
}
