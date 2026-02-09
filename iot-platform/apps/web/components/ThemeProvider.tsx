'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';

/**
 * Theme Provider Component
 *
 * Wraps next-themes provider for dark mode support
 * - Enables system, light, and dark themes
 * - Persists theme preference to localStorage
 * - Prevents flash of unstyled content
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
