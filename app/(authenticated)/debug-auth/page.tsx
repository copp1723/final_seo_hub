'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check session
        const sessionRes = await fetch('/api/auth/simple-session');
        const sessionData = await sessionRes.json();
        
        // Check cookies
        const cookies = document.cookie.split(';').map(c => c.trim());
        const sessionCookie = cookies.find(c => c.startsWith('seo-hub-session='));
        
        // Test emergency login
        let emergencyLoginResult = null;
        try {
          const emergencyRes = await fetch('/api/auth/simple-signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'josh.copp@onekeel.ai' })
          });
          emergencyLoginResult = {
            status: emergencyRes.status,
            data: await emergencyRes.json()
          };
        } catch (e) {
          emergencyLoginResult = { error: e instanceof Error ? e.message : String(e) };
        }
        
        setDebugInfo({
          timestamp: new Date().toISOString(),
          session: {
            status: sessionRes.status,
            data: sessionData
          },
          cookies: {
            all: cookies,
            sessionCookie: sessionCookie || 'Not found'
          },
          emergencyLogin: emergencyLoginResult,
          environment: {
            nodeEnv: process.env.NODE_ENV,
            url: window.location.href
          }
        });
      } catch (error) {
        setDebugInfo({ error: error instanceof Error ? error.message : String(error) });
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  const handleEmergencyLogin = async () => {
    try {
      const res = await fetch('/api/auth/simple-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'josh.copp@onekeel.ai' })
      });
      
      if (res.ok) {
        alert('Emergency login successful! Redirecting to dashboard...');
        router.push('/dashboard');
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Login failed: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading debug information...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Information</h1>
      
      <div className="mb-6">
        <button
          onClick={handleEmergencyLogin}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Emergency Login (josh.copp@onekeel.ai)
        </button>
      </div>
      
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      
      <div className="mt-6 space-y-2">
        <a href="/auth/simple-signin" className="text-blue-600 hover:underline block">
          → Go to Simple Sign In
        </a>
        <a href="/dashboard" className="text-blue-600 hover:underline block">
          → Try Dashboard (will redirect if not authenticated)
        </a>
      </div>
    </div>
  );
}