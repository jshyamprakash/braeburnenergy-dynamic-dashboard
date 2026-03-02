import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api-client';
import type { RootState } from '../index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetentionPolicy {
  _id: string;
  name: string;
  category: 'device_states' | 'audit_logs' | 'alarms' | 'calibration_records';
  hotStorageDuration: number;
  warmStorageDuration: number;
  coldStorageDuration: number;
  totalRetentionDuration: number;
  archiveEnabled: boolean;
  archiveDestination?: string;
  compressionEnabled: boolean;
  compressionThreshold?: number;
  regulatoryRequirement?: string;
  minimumRetentionDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StatCard {
  category: string;
  label: string;
  hotDays: number;
  warmDays: number;
  coldDays: number;
  totalDays: number;
}

const CATEGORIES = [
  { value: 'device_states', label: 'Device States' },
  { value: 'audit_logs', label: 'Audit Logs' },
  { value: 'alarms', label: 'Alarms' },
  { value: 'calibration_records', label: 'Calibration Records' },
] as const;

export interface PolicyState {
  policies: RetentionPolicy[];
  stats: StatCard[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

/** Fetch all retention policies */
export const fetchPolicies = createAsyncThunk<RetentionPolicy[], void, { rejectValue: string }>(
  'policy/fetchPolicies',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<RetentionPolicy[]>('/retention-policies');
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to fetch policies');
    }
  }
);

/** Fetch per-category retention stats */
export const fetchStats = createAsyncThunk<StatCard[], void, { rejectValue: string }>(
  'policy/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const results = await Promise.allSettled(
        CATEGORIES.map((cat) =>
          apiClient.get<any>(`/retention-policies/stats/${cat.value}`).then((res) => ({
            category: cat.value,
            label: cat.label,
            hotDays: res.data.hotStorageDays || 0,
            warmDays: res.data.warmStorageDays || 0,
            coldDays: res.data.coldStorageDays || 0,
            totalDays: res.data.totalRetentionDays || 0,
          }))
        )
      );
      return results.map((result, i) =>
        result.status === 'fulfilled'
          ? result.value
          : {
              category: CATEGORIES[i].value,
              label: CATEGORIES[i].label,
              hotDays: 0,
              warmDays: 0,
              coldDays: 0,
              totalDays: 0,
            }
      );
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to fetch stats');
    }
  }
);

/** Fetch policies and stats in parallel */
export const fetchPolicyData = createAsyncThunk<
  { policies: RetentionPolicy[]; stats: StatCard[] },
  void,
  { rejectValue: string }
>('policy/fetchPolicyData', async (_, { dispatch, rejectWithValue }) => {
  try {
    const [policiesRes, statsRes] = await Promise.all([
      dispatch(fetchPolicies()).unwrap(),
      dispatch(fetchStats()).unwrap(),
    ]);
    return { policies: policiesRes, stats: statsRes };
  } catch (err: any) {
    return rejectWithValue(err?.message ?? 'Failed to load policy data');
  }
});

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const initialState: PolicyState = {
  policies: [],
  stats: [],
  status: 'idle',
  error: null,
};

const policySlice = createSlice({
  name: 'policy',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // fetchPolicyData (combined)
    builder
      .addCase(fetchPolicyData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPolicyData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.policies = action.payload.policies;
        state.stats = action.payload.stats;
      })
      .addCase(fetchPolicyData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unknown error';
      });

    // fetchPolicies (standalone — called after save/delete)
    builder.addCase(fetchPolicies.fulfilled, (state, action) => {
      state.policies = action.payload;
    });

    // fetchStats (standalone — called after save/delete)
    builder.addCase(fetchStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });
  },
});

export default policySlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectPolicies = (state: RootState) => state.policy.policies;
export const selectPolicyStats = (state: RootState) => state.policy.stats;
export const selectPolicyStatus = (state: RootState) => state.policy.status;
export const selectPolicyError = (state: RootState) => state.policy.error;
