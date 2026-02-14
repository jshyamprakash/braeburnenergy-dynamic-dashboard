import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authConfig } from '@/lib/config';

/**
 * User interface matching backend User model
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Operator' | 'Viewer';
  organizationId: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Auth state interface
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Load auth state from localStorage
 */
function loadAuthFromStorage(): Partial<AuthState> {
  if (typeof window === 'undefined') return {};

  try {
    const accessToken = localStorage.getItem(authConfig.tokenKey);
    const refreshToken = localStorage.getItem(authConfig.refreshTokenKey);
    const userJson = localStorage.getItem(authConfig.userKey);
    const user = userJson ? JSON.parse(userJson) : null;

    return {
      accessToken,
      refreshToken,
      user,
      isAuthenticated: !!accessToken && !!user,
    };
  } catch (error) {
    console.error('Failed to load auth from storage:', error);
    return {};
  }
}

/**
 * Save auth state to localStorage
 */
function saveAuthToStorage(state: AuthState) {
  if (typeof window === 'undefined') return;

  try {
    if (state.accessToken) {
      localStorage.setItem(authConfig.tokenKey, state.accessToken);
    } else {
      localStorage.removeItem(authConfig.tokenKey);
    }

    if (state.refreshToken) {
      localStorage.setItem(authConfig.refreshTokenKey, state.refreshToken);
    } else {
      localStorage.removeItem(authConfig.refreshTokenKey);
    }

    if (state.user) {
      localStorage.setItem(authConfig.userKey, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(authConfig.userKey);
    }
  } catch (error) {
    console.error('Failed to save auth to storage:', error);
  }
}

/**
 * Clear auth from localStorage
 */
function clearAuthFromStorage() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(authConfig.tokenKey);
    localStorage.removeItem(authConfig.refreshTokenKey);
    localStorage.removeItem(authConfig.userKey);
  } catch (error) {
    console.error('Failed to clear auth from storage:', error);
  }
}

/**
 * Initial state
 */
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  ...loadAuthFromStorage(),
};

/**
 * Auth slice
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set error
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    /**
     * Login success
     */
    loginSuccess: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;

      saveAuthToStorage(state);
    },

    /**
     * Logout
     */
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;

      clearAuthFromStorage();
    },

    /**
     * Update tokens (after refresh)
     */
    updateTokens: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;

      saveAuthToStorage(state);
    },

    /**
     * Update user profile
     */
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        saveAuthToStorage(state);
      }
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },
  },
});

/**
 * Export actions
 */
export const {
  setLoading,
  setError,
  loginSuccess,
  logout,
  updateTokens,
  updateUser,
  clearError,
} = authSlice.actions;

/**
 * Export reducer
 */
export default authSlice.reducer;

/**
 * Selectors
 */
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;
export const selectAccessToken = (state: { auth: AuthState }) =>
  state.auth.accessToken;
export const selectAuthLoading = (state: { auth: AuthState }) =>
  state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
