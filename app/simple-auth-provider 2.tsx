'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
  agencyId: string | null;
  dealershipId: string | null;
  name?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/simple-session', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error in checkSession:', error);
      setUser(null);
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/simple-signout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      router.push('/auth/simple-signin');
    } catch (error) {
      console.error('Error in signOut:', error);
      setUser(null);
      router.push('/auth/simple-signin');
    }
  };

  const refreshSession = async () => {
    try {
      await checkSession();
    } catch (error) {
      console.error('Error in refreshSession:', error);
    }
  };

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize session after mount
  useEffect(() => {
    if (!mounted) return;

    checkSession();

    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    // Check session on window focus - only if window is available
    const handleFocus = () => checkSession();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [mounted]);

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}