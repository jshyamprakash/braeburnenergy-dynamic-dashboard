'use client';

import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  selectUser,
  selectAccessToken,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  clearError,
  loginThunk,
  logoutThunk,
  refreshTokenThunk,
} from '@/lib/store/slices/authSlice';

/**
 * useAuth — thin Redux-backed adapter.
 * Exposes the same interface previously provided by AuthContext.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const accessToken = useAppSelector(selectAccessToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    login: (username: string, password: string) =>
      dispatch(loginThunk({ username, password })).unwrap(),
    logout: () => dispatch(logoutThunk()),
    refreshToken: () => dispatch(refreshTokenThunk()),
    clearError: () => dispatch(clearError()),
  };
}
