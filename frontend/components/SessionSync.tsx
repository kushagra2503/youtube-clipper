"use client";

import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';

export default function SessionSync() {
  const { data: session } = useSession();
  const lastSyncedState = useRef<{ authenticated: boolean; email?: string }>({ authenticated: false });

  useEffect(() => {
    const syncSession = async (action: 'login' | 'logout', userData?: { email: string; name: string }) => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/sync-session', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData?.email,
            name: userData?.name,
            action
          }),
        });
        
        if (response.ok) {
          console.log(`Backend session sync successful: ${action}`);
        } else {
          console.warn(`Backend session sync failed: ${action}`, await response.text());
        }
      } catch (error) {
        console.warn(`Backend session sync error: ${action}`, error);
      }
    };

    // Check if authentication state changed
    const isAuthenticated = !!session?.user;
    const userEmail = session?.user?.email;
    
    if (isAuthenticated !== lastSyncedState.current.authenticated) {
      if (isAuthenticated && userEmail) {
        // User logged in
        syncSession('login', {
          email: userEmail,
          name: session.user.name || userEmail.split('@')[0]
        });
        lastSyncedState.current = { authenticated: true, email: userEmail };
      } else if (!isAuthenticated && lastSyncedState.current.authenticated) {
        // User logged out
        syncSession('logout', {
          email: lastSyncedState.current.email || '',
          name: ''
        });
        lastSyncedState.current = { authenticated: false };
      }
    }
  }, [session]);

  return null; // This component doesn't render anything
} 