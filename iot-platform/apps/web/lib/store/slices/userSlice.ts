import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api-client';
import type { RootState } from '../index';

// ---------------------------------------------------------------------------
// Types (mirrored from profile/page.tsx — single source after migration)
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  organizationId: string;
  lastLogin?: string;
  createdAt: string;
}

export interface TokenSession {
  jti: string;
  type: 'access' | 'refresh';
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ApiKeyEntry {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateApiKeyPayload {
  name: string;
  prefix: 'iot_live_' | 'iot_test_';
  permissions: string[];
  expiresAt?: Date;
}

export interface UserState {
  profile: UserProfile | null;
  sessions: TokenSession[];
  apiKeys: ApiKeyEntry[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

/** Fetch profile, sessions and API keys in parallel */
export const fetchProfileData = createAsyncThunk<
  { profile: UserProfile; sessions: TokenSession[]; apiKeys: ApiKeyEntry[] },
  void,
  { rejectValue: string }
>('user/fetchProfileData', async (_, { rejectWithValue }) => {
  try {
    const [profileRes, sessionsRes, apiKeysRes] = await Promise.all([
      apiClient.get<UserProfile>('/auth/profile'),
      apiClient.get<any>('/auth/sessions'),
      apiClient.get<ApiKeyEntry[]>('/api-keys'),
    ]);
    return {
      profile: profileRes.data,
      sessions: sessionsRes.data || [],
      apiKeys: apiKeysRes.data || [],
    };
  } catch (err: any) {
    return rejectWithValue(err?.message ?? 'Failed to load profile');
  }
});

/** Refresh sessions list only (called after password change) */
export const fetchSessions = createAsyncThunk<TokenSession[], void, { rejectValue: string }>(
  'user/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<any>('/auth/sessions');
      return res.data || [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load sessions');
    }
  }
);

/** Refresh API keys list only */
export const fetchApiKeys = createAsyncThunk<ApiKeyEntry[], void, { rejectValue: string }>(
  'user/fetchApiKeys',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<ApiKeyEntry[]>('/api-keys');
      return res.data || [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load API keys');
    }
  }
);

/** Create a new API key — returns the full plaintext key (one-time reveal) */
export const createApiKey = createAsyncThunk<
  { fullKey: string; id: string; keys: ApiKeyEntry[] },
  CreateApiKeyPayload,
  { rejectValue: string }
>('user/createApiKey', async (payload, { rejectWithValue }) => {
  try {
    const createRes = await apiClient.post<any>('/api-keys', payload);
    const keysRes = await apiClient.get<ApiKeyEntry[]>('/api-keys');
    return {
      fullKey: createRes.data.key,
      id: createRes.data.id,
      keys: keysRes.data || [],
    };
  } catch (err: any) {
    return rejectWithValue(err?.message ?? 'Failed to create API key');
  }
});

/** Revoke an API key */
export const revokeApiKey = createAsyncThunk<ApiKeyEntry[], string, { rejectValue: string }>(
  'user/revokeApiKey',
  async (keyId, { rejectWithValue }) => {
    try {
      await apiClient.post(`/api-keys/${keyId}/revoke`, {});
      const res = await apiClient.get<ApiKeyEntry[]>('/api-keys');
      return res.data || [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to revoke API key');
    }
  }
);

/** Delete an API key */
export const deleteApiKey = createAsyncThunk<ApiKeyEntry[], string, { rejectValue: string }>(
  'user/deleteApiKey',
  async (keyId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/api-keys/${keyId}`);
      const res = await apiClient.get<ApiKeyEntry[]>('/api-keys');
      return res.data || [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to delete API key');
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const initialState: UserState = {
  profile: null,
  sessions: [],
  apiKeys: [],
  status: 'idle',
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    /** Clear the one-time newly-created key reveal after user dismisses it */
    clearProfile: () => initialState,
  },
  extraReducers: (builder) => {
    // fetchProfileData
    builder
      .addCase(fetchProfileData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProfileData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload.profile;
        state.sessions = action.payload.sessions;
        state.apiKeys = action.payload.apiKeys;
      })
      .addCase(fetchProfileData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unknown error';
      });

    // fetchSessions
    builder
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.sessions = action.payload;
      });

    // fetchApiKeys
    builder
      .addCase(fetchApiKeys.fulfilled, (state, action) => {
        state.apiKeys = action.payload;
      });

    // createApiKey — updates keys list; fullKey returned to caller via unwrap()
    builder
      .addCase(createApiKey.fulfilled, (state, action) => {
        state.apiKeys = action.payload.keys;
      });

    // revokeApiKey / deleteApiKey — both return refreshed keys list
    builder
      .addCase(revokeApiKey.fulfilled, (state, action) => {
        state.apiKeys = action.payload;
      })
      .addCase(deleteApiKey.fulfilled, (state, action) => {
        state.apiKeys = action.payload;
      });
  },
});

export const { clearProfile } = userSlice.actions;
export default userSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectUserProfile = (state: RootState) => state.user.profile;
export const selectSessions = (state: RootState) => state.user.sessions;
export const selectApiKeys = (state: RootState) => state.user.apiKeys;
export const selectUserStatus = (state: RootState) => state.user.status;
export const selectUserError = (state: RootState) => state.user.error;
