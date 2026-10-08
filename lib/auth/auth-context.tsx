'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type User, type UserRole, type Permission } from '@/lib/data/types';
import { hasPermission, hasAnyPermission, ROLE_DISPLAY_NAMES, type GeographicScope } from './permissions';

// ============================================
// Auth Context Types
// ============================================

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  getRoleDisplayName: () => string;
  getScopeDisplayName: () => string;
  getGeographicScope: () => GeographicScope | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function readJsonSafely<T = any>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ============================================
// Auth Provider
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const payload = await readJsonSafely<{ user?: User | null }>(res);
        if (!res.ok) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return;
        }
        const user = payload?.user ?? null;
        if (user) {
          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };
    void loadSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const payload = await readJsonSafely<{ user?: User; error?: string }>(res);
    if (!res.ok) {
      return { success: false, error: payload?.error || 'Login failed' };
    }

    const apiUser = payload?.user as User | undefined;
    if (!apiUser) {
      return { success: false, error: 'Login response was not valid JSON' };
    }
    const updatedUser: User = {
      ...apiUser,
      password: '',
    };
    
    setState({
      user: updatedUser,
      isLoading: false,
      isAuthenticated: true,
    });

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    void fetch('/api/auth/logout', { method: 'POST' });
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const checkPermission = useCallback((permission: Permission): boolean => {
    if (!state.user) return false;
    return hasPermission(state.user.role, permission);
  }, [state.user]);

  const checkAnyPermission = useCallback((permissions: Permission[]): boolean => {
    if (!state.user) return false;
    return hasAnyPermission(state.user.role, permissions);
  }, [state.user]);

  const getRoleDisplayName = useCallback((): string => {
    if (!state.user) return '';
    return ROLE_DISPLAY_NAMES[state.user.role];
  }, [state.user]);

  const getScopeDisplayName = useCallback((): string => {
    if (!state.user) return '';
    
    const { scope } = state.user;
    
    switch (scope.type) {
      case 'city':
        return 'Addis Ababa';
      case 'zone': {
        return scope.zoneId || 'Unknown Zone';
      }
      case 'woreda': {
        return scope.woredaId || 'Unknown Woreda';
      }
      case 'kebele': {
        return scope.kebeleId || 'Unknown Kebele';
      }
      default:
        return 'Unknown';
    }
  }, [state.user]);

  const getGeographicScope = useCallback((): GeographicScope | null => {
    if (!state.user) return null;
    return state.user.scope;
  }, [state.user]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        hasPermission: checkPermission,
        hasAnyPermission: checkAnyPermission,
        getRoleDisplayName,
        getScopeDisplayName,
        getGeographicScope,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Auth Hook
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================
// Permission Hook
// ============================================

export function usePermissions() {
  const { user, hasPermission, hasAnyPermission } = useAuth();
  
  return {
    role: user?.role as UserRole | undefined,
    scope: user?.scope,
    can: hasPermission,
    canAny: hasAnyPermission,
  };
}

// ============================================
// Protected Component Wrapper
// ============================================

interface ProtectedProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function Protected({ 
  children, 
  permission, 
  permissions, 
  fallback = null,
  requireAll = false,
}: ProtectedProps) {
  const { hasPermission, hasAnyPermission } = useAuth();
  
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      const hasAll = permissions.every(p => hasPermission(p));
      if (!hasAll) return <>{fallback}</>;
    } else {
      if (!hasAnyPermission(permissions)) return <>{fallback}</>;
    }
  }
  
  return <>{children}</>;
}
