'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 *
 * Wraps pages that require authentication.
 * Automatically redirects to login page if user is not authenticated.
 * Preserves intended destination for redirect after login.
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      // Store intended destination for redirect after login
      const returnUrl = pathname;
      const loginUrl = returnUrl !== '/'
        ? `${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`
        : redirectTo;

      router.push(loginUrl);
    }
  }, [isLoading, isAuthenticated, requireAuth, router, pathname, redirectTo]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated (will redirect)
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}
