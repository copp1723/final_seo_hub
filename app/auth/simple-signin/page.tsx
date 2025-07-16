'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/simple-auth-provider';

export default function SimpleSignInPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmergencyAccess, setIsEmergencyAccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const { refreshSession } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError('');

    try {
      // For emergency access, use hardcoded admin email
      let emailToUse = email;
      
      if (isEmergencyAccess) {
        // Force use of admin email for emergency access
        emailToUse = 'josh.copp@onekeel.ai';
        console.log('Using emergency admin email:', emailToUse);
      } else {
        // For normal login, validate email
        if (!email || email.trim() === '') {
          setIsLoading(false);
          setError('Email is required');
          return;
        }
      }
      
      // For emergency access users (hardcoded admins), token is not required
      const payload = isEmergencyAccess
        ? { email: emailToUse }
        : { email: emailToUse, token };

      console.log('Submitting with payload:', payload);
      
      // Add a small delay to ensure the console log is visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch('/api/auth/simple-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Refresh the session in the auth provider before redirecting
      await refreshSession();
      
      // Small delay to ensure session is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to dashboard or callback URL
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to SEO Hub
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isEmergencyAccess 
              ? 'Emergency access for admin users' 
              : 'Enter your invitation details to access your account'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="email"
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${isEmergencyAccess ? 'rounded-md' : 'rounded-t-md'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  console.log('Email input change:', e.target.value);
                  setEmail(e.target.value);
                }}
              />
            </div>
            {!isEmergencyAccess && (
              <div>
                <label htmlFor="token" className="sr-only">
                  Invitation Token
                </label>
                <input
                  id="token"
                  name="token"
                  type="text"
                  required={!isEmergencyAccess}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Invitation token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="emergency-access"
              name="emergency-access"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isEmergencyAccess}
              onChange={() => {
                console.log('Emergency access toggled, current:', isEmergencyAccess);
                setIsEmergencyAccess(!isEmergencyAccess);
              }}
            />
            <label htmlFor="emergency-access" className="ml-2 block text-sm text-gray-900">
              Emergency admin access
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}