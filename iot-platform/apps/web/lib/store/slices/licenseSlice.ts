import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api-client';

/**
 * License state interface
 */
export interface LicenseState {
  valid: boolean;
  customer: string;
  modules: string[];
  expiresAt: string | null;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
}

/**
 * License data shape (what the backend returns in success response)
 */
interface LicenseData {
  valid: boolean;
  customer: string;
  modules: string[];
  expiresAt: string;
}

/**
 * Initial state
 */
const initialState: LicenseState = {
  valid: false,
  customer: '',
  modules: [],
  expiresAt: null,
  status: 'idle',
  error: null,
};

/**
 * Async thunk: fetch license from backend
 */
export const fetchLicense = createAsyncThunk(
  'license/fetchLicense',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<LicenseData>('/api/v1/license');
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
        state.valid = action.payload.valid;
        state.customer = action.payload.customer;
        state.modules = action.payload.modules;
        state.expiresAt = action.payload.expiresAt;
        state.error = null;
      })
      .addCase(fetchLicense.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
        state.valid = false;
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
  state.license.modules;
export const selectLicenseStatus = (state: { license: LicenseState }) =>
  state.license.status;
export const selectLicenseValid = (state: { license: LicenseState }) =>
  state.license.valid;
export const selectLicenseCustomer = (state: { license: LicenseState }) =>
  state.license.customer;
export const selectLicenseExpiresAt = (state: { license: LicenseState }) =>
  state.license.expiresAt;

/**
 * Helper: check if a module is enabled
 */
export function isModuleEnabled(modules: string[], key: string): boolean {
  return modules.includes(key);
}
