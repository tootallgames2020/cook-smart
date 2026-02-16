'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps): React.ReactElement | null {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect if we're still loading
    if (isLoading) {
      return;
    }

    // Only redirect if we're definitely not loading and not authenticated
    if (!isAuthenticated) {
      // Use a longer delay to prevent race conditions with auth state updates
      const redirectTimer = setTimeout(() => {
        router.push('/admin/login');
      }, 200);

      // Cleanup timer if component unmounts or auth state changes
      return () => {
        clearTimeout(redirectTimer);
      };
    }

    if (isAuthenticated && requiredRole && user?.role !== requiredRole) {
      router.push('/admin/unauthorized');
    }
  }, [isAuthenticated, isLoading, requiredRole, user, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if wrong role (redirect will happen)
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
