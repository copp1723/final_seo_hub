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
  const router = useRouter();

  const checkSession = async () => {
    // AUTO-LOGIN: Always set super admin user
    setUser({
      id: 'auto-super-admin',
      email: 'josh.copp@onekeel.ai',
      role: 'SUPER_ADMIN',
      agencyId: null,
      dealershipId: null,
      name: 'Josh Copp (Auto Super Admin)'
    });
    setIsLoading(false);
  };

  const signOut = async () => {
    // AUTO-LOGIN: Prevent sign out, just refresh to dashboard
    router.push('/dashboard');
  };

  const refreshSession = async () => {
    await checkSession();
  };

  useEffect(() => {
    checkSession();
    
    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    // Check session on window focus
    const handleFocus = () => checkSession();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}