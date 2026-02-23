'use client';

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api-client';

/**
 * Alarm State Management (Redux Slice)
 *
 * Manages ISA-18.2 compliant alarm management:
 * - Alarm instances (active, cleared, shelved)
 * - Alarm rules (definitions, conditions, actions)
 * - Statistics and filtering
 */

export interface AlarmStatistics {
  total: number;
  unacknowledged: number;
  active: number;
  byCritical: number;
  byHigh: number;
  byMedium: number;
  byLow: number;
  byInfo: number;
}

export interface AlarmInstance {
  _id: string;
  alarmRuleId: string;
  tagName: string;
  deviceId: string;
  field: string;
  triggerValue: number | string;
  triggerTimestamp: string;
  state: 'ACTIVE_UNACKED' | 'ACTIVE_ACKED' | 'CLEARED_UNACKED' | 'CLEARED_ACKED' | 'SHELVED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  requiresAcknowledgment: boolean;
  activeTimestamp: string;
  acknowledgedTimestamp?: string;
  acknowledgedBy?: string;
  acknowledgmentComment?: string;
  isShelved: boolean;
  shelvedUntil?: string;
}

export interface AlarmRule {
  _id: string;
  name: string;
  description?: string;
  tagName: string;
  deviceId?: string;
  field: string;
  conditionType: string;
  operator: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  isActive: boolean;
  isEnabled: boolean;
  isShelved: boolean;
  requiresAcknowledgment: boolean;
}

export interface AlarmState {
  // Alarm instances
  alarms: AlarmInstance[];
  alarmsTotal: number;
  alarmsLoading: boolean;
  alarmsError: string | null;

  // Alarm rules
  rules: AlarmRule[];
  rulesTotal: number;
  rulesLoading: boolean;
  rulesError: string | null;

  // Statistics
  statistics: AlarmStatistics | null;
  statisticsLoading: boolean;

  // Filters
  filterState: string | null;
  filterPriority: string | null;
  filterDeviceId: string | null;

  // UI state
  actionLoading: string | null; // ID of alarm/rule being actioned
  actionError: string | null;
}

const initialState: AlarmState = {
  alarms: [],
  alarmsTotal: 0,
  alarmsLoading: false,
  alarmsError: null,

  rules: [],
  rulesTotal: 0,
  rulesLoading: false,
  rulesError: null,

  statistics: null,
  statisticsLoading: false,

  filterState: null,
  filterPriority: null,
  filterDeviceId: null,

  actionLoading: null,
  actionError: null,
};

/**
 * Async Thunks
 */

export const loadAlarms = createAsyncThunk<
  { alarms: AlarmInstance[]; total: number },
  { state?: string; priority?: string; deviceId?: string; limit?: number; offset?: number }
>('alarm/loadAlarms', async (filters) => {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.deviceId) params.append('deviceId', filters.deviceId);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const response = await apiClient.get<{ data: AlarmInstance[]; pagination: { total: number } }>(
    `/alarms?${params.toString()}`
  );
  return {
    alarms: response.data.data,
    total: response.data.pagination.total,
  };
});

export const loadAlarmStatistics = createAsyncThunk<AlarmStatistics>(
  'alarm/loadStatistics',
  async () => {
    const response = await apiClient.get<AlarmStatistics>('/alarms/statistics');
    return response.data;
  }
);

export const loadAlarmRules = createAsyncThunk<{ rules: AlarmRule[]; total: number }, { limit?: number; offset?: number }>(
  'alarm/loadRules',
  async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));

    const response = await apiClient.get<{ data: AlarmRule[]; pagination: { total: number } }>(
      `/alarm-rules?${params.toString()}`
    );
    return {
      rules: response.data.data,
      total: response.data.pagination.total,
    };
  }
);

export const acknowledgeAlarm = createAsyncThunk<AlarmInstance, { alarmId: string; comment?: string }>(
  'alarm/acknowledge',
  async ({ alarmId, comment }) => {
    const response = await apiClient.post<AlarmInstance>(`/alarms/${alarmId}/acknowledge`, {
      comment: comment || '',
    });
    return response.data;
  }
);

export const shelveAlarm = createAsyncThunk<AlarmInstance, { alarmId: string; reason?: string; duration?: number }>(
  'alarm/shelve',
  async ({ alarmId, reason, duration }) => {
    const response = await apiClient.post<AlarmInstance>(`/alarms/${alarmId}/shelve`, {
      reason: reason || '',
      duration: duration || 3600,
    });
    return response.data;
  }
);

export const unshelveAlarm = createAsyncThunk<AlarmInstance, string>('alarm/unshelve', async (alarmId) => {
  const response = await apiClient.post<AlarmInstance>(`/alarms/${alarmId}/unshelve`, {});
  return response.data;
});

export const createAlarmRule = createAsyncThunk<AlarmRule, Partial<AlarmRule>>(
  'alarm/createRule',
  async (ruleData) => {
    const response = await apiClient.post<AlarmRule>('/alarm-rules', ruleData);
    return response.data;
  }
);

export const updateAlarmRule = createAsyncThunk<AlarmRule, { ruleId: string; data: Partial<AlarmRule> }>(
  'alarm/updateRule',
  async ({ ruleId, data }) => {
    const response = await apiClient.patch<AlarmRule>(`/alarm-rules/${ruleId}`, data);
    return response.data;
  }
);

export const deleteAlarmRule = createAsyncThunk<string, string>('alarm/deleteRule', async (ruleId) => {
  await apiClient.delete(`/alarm-rules/${ruleId}`);
  return ruleId;
});

export const shelveAlarmRule = createAsyncThunk<AlarmRule, { ruleId: string; reason?: string; duration?: number }>(
  'alarm/shelveRule',
  async ({ ruleId, reason, duration }) => {
    const response = await apiClient.post<AlarmRule>(`/alarm-rules/${ruleId}/shelve`, {
      reason: reason || '',
      duration: duration || 3600,
    });
    return response.data;
  }
);

export const unshelveAlarmRule = createAsyncThunk<AlarmRule, string>('alarm/unshelveRule', async (ruleId) => {
  const response = await apiClient.post<AlarmRule>(`/alarm-rules/${ruleId}/unshelve`, {});
  return response.data;
});

/**
 * Alarm Slice
 */
export const alarmSlice = createSlice({
  name: 'alarm',
  initialState,
  reducers: {
    setFilterState: (state, action: PayloadAction<string | null>) => {
      state.filterState = action.payload;
    },
    setFilterPriority: (state, action: PayloadAction<string | null>) => {
      state.filterPriority = action.payload;
    },
    setFilterDeviceId: (state, action: PayloadAction<string | null>) => {
      state.filterDeviceId = action.payload;
    },
    clearFilters: (state) => {
      state.filterState = null;
      state.filterPriority = null;
      state.filterDeviceId = null;
    },
  },
  extraReducers: (builder) => {
    // Load alarms
    builder
      .addCase(loadAlarms.pending, (state) => {
        state.alarmsLoading = true;
        state.alarmsError = null;
      })
      .addCase(loadAlarms.fulfilled, (state, action) => {
        state.alarmsLoading = false;
        state.alarms = action.payload.alarms;
        state.alarmsTotal = action.payload.total;
      })
      .addCase(loadAlarms.rejected, (state, action) => {
        state.alarmsLoading = false;
        state.alarmsError = action.error.message || 'Failed to load alarms';
      });

    // Load statistics
    builder
      .addCase(loadAlarmStatistics.pending, (state) => {
        state.statisticsLoading = true;
      })
      .addCase(loadAlarmStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.statistics = action.payload;
      })
      .addCase(loadAlarmStatistics.rejected, (state) => {
        state.statisticsLoading = false;
      });

    // Load rules
    builder
      .addCase(loadAlarmRules.pending, (state) => {
        state.rulesLoading = true;
        state.rulesError = null;
      })
      .addCase(loadAlarmRules.fulfilled, (state, action) => {
        state.rulesLoading = false;
        state.rules = action.payload.rules;
        state.rulesTotal = action.payload.total;
      })
      .addCase(loadAlarmRules.rejected, (state, action) => {
        state.rulesLoading = false;
        state.rulesError = action.error.message || 'Failed to load rules';
      });

    // Acknowledge alarm
    builder
      .addCase(acknowledgeAlarm.pending, (state, action) => {
        state.actionLoading = (action.meta.arg as any).alarmId;
      })
      .addCase(acknowledgeAlarm.fulfilled, (state, action) => {
        state.actionLoading = null;
        const idx = state.alarms.findIndex((a) => a._id === action.payload._id);
        if (idx >= 0) {
          state.alarms[idx] = action.payload;
        }
      })
      .addCase(acknowledgeAlarm.rejected, (state, action) => {
        state.actionLoading = null;
        state.actionError = action.error.message || 'Failed to acknowledge alarm';
      });

    // Shelve alarm
    builder
      .addCase(shelveAlarm.pending, (state, action) => {
        state.actionLoading = (action.meta.arg as any).alarmId;
      })
      .addCase(shelveAlarm.fulfilled, (state, action) => {
        state.actionLoading = null;
        const idx = state.alarms.findIndex((a) => a._id === action.payload._id);
        if (idx >= 0) {
          state.alarms[idx] = action.payload;
        }
      });

    // Unshelve alarm
    builder.addCase(unshelveAlarm.fulfilled, (state, action) => {
      const idx = state.alarms.findIndex((a) => a._id === action.payload._id);
      if (idx >= 0) {
        state.alarms[idx] = action.payload;
      }
    });

    // Create rule
    builder
      .addCase(createAlarmRule.pending, (state) => {
        state.actionLoading = 'create-rule';
      })
      .addCase(createAlarmRule.fulfilled, (state, action) => {
        state.actionLoading = null;
        state.rules.unshift(action.payload);
        state.rulesTotal += 1;
      })
      .addCase(createAlarmRule.rejected, (state, action) => {
        state.actionLoading = null;
        state.actionError = action.error.message || 'Failed to create rule';
      });

    // Update rule
    builder.addCase(updateAlarmRule.fulfilled, (state, action) => {
      const idx = state.rules.findIndex((r) => r._id === action.payload._id);
      if (idx >= 0) {
        state.rules[idx] = action.payload;
      }
    });

    // Delete rule
    builder.addCase(deleteAlarmRule.fulfilled, (state, action) => {
      state.rules = state.rules.filter((r) => r._id !== action.payload);
      state.rulesTotal -= 1;
    });

    // Shelve rule
    builder.addCase(shelveAlarmRule.fulfilled, (state, action) => {
      const idx = state.rules.findIndex((r) => r._id === action.payload._id);
      if (idx >= 0) {
        state.rules[idx] = action.payload;
      }
    });

    // Unshelve rule
    builder.addCase(unshelveAlarmRule.fulfilled, (state, action) => {
      const idx = state.rules.findIndex((r) => r._id === action.payload._id);
      if (idx >= 0) {
        state.rules[idx] = action.payload;
      }
    });
  },
});

export const { setFilterState, setFilterPriority, setFilterDeviceId, clearFilters } = alarmSlice.actions;
export default alarmSlice.reducer;
