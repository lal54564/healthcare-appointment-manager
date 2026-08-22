/**
 * Auth Context Provider
 * 
 * Provides authentication state throughout the React component tree.
 * Handles session persistence, auth state changes, and role-based access.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser, UserRole } from '../../lib/db/types';
import { getCurrentUser, signIn, signUp, signOut, onAuthStateChange } from '../../lib/auth/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null, user?: AuthUser | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: string | null, user?: AuthUser | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Initial load
    refreshUser().finally(() => setLoading(false));

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange((newUser) => {
      setUser(newUser);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn({ email, password });
    if (result.user) {
      setUser(result.user);
    }
    return { error: result.error, user: result.user };
  };

  const handleSignUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    const result = await signUp({ email, password, fullName, role });
    if (result.user) {
      setUser(result.user);
    }
    return { error: result.error, user: result.user };
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        refreshUser,
      },
    },
    children
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication and optionally a specific role.
 * Returns the authenticated user or null if loading/unauthorized.
 */
export function useRequireAuth(requiredRole?: UserRole): {
  user: AuthUser | null;
  loading: boolean;
  authorized: boolean;
} {
  const { user, loading } = useAuth();
  
  const authorized = !loading && !!user && (!requiredRole || user.role === requiredRole);
  
  return { user, loading, authorized };
}
