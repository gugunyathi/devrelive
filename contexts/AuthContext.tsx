'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createBaseAccountSDK } from '@base-org/account';

export interface UserData {
  userId: string;
  address: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  isAdmin: boolean;
  joinedAt: string;
  lastSeenAt: string;
  stats: {
    totalCalls: number;
    totalMessages: number;
    totalDuration: number;
  };
  preferences: {
    notifications: boolean;
    theme: string;
  };
}

interface AuthContextType {
  address: string | null;
  userId: string | null;
  userData: UserData | null;
  sessionId: string | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Singleton SDK instance
let sdkInstance: ReturnType<typeof createBaseAccountSDK> | null = null;

function getSDK() {
  if (!sdkInstance) {
    sdkInstance = createBaseAccountSDK({
      appName: 'DevReLive',
      appLogoUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/icon.png`,
    });
  }
  return sdkInstance;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('devrelive_address');
    const savedUserId = localStorage.getItem('devrelive_userId');
    const savedSessionId = localStorage.getItem('devrelive_sessionId');

    if (savedAddress) setAddress(savedAddress);
    if (savedUserId) setUserId(savedUserId);
    if (savedSessionId) setSessionId(savedSessionId);

    // Re-fetch fresh user data in the background
    if (savedAddress) {
      fetch(`/api/users/${savedAddress}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.user) setUserData(data.user); })
        .catch(() => {}); // Non-fatal
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/users/${address}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
      }
    } catch {
      // Non-fatal
    }
  }, [address]);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    try {
      const provider = getSDK().getProvider();

      // 1 — server-issued nonce (replay-safe)
      const { nonce } = await fetch('/api/auth/nonce').then(r => r.json());

      // 2 — switch to Base Mainnet (non-fatal if unsupported)
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      } catch { /* ignore */ }

      // 3 — wallet_connect + SIWE
      const result = await provider.request({
        method: 'wallet_connect',
        params: [
          {
            version: '1',
            capabilities: {
              signInWithEthereum: {
                nonce,
                chainId: '0x2105', // Base Mainnet (8453)
              },
            },
          },
        ],
      }) as {
        accounts: {
          address: string;
          capabilities: {
            signInWithEthereum: { message: string; signature: string };
          };
        }[];
      };

      const { accounts } = result;
      const { address: userAddress } = accounts[0];
      const { message, signature } = accounts[0].capabilities.signInWithEthereum;

      // 4 — server-side signature verification
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress, message, signature }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error ?? 'Signature verification failed');
      }

      // 5 — upsert user in MongoDB — get back userId
      const userRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress }),
      });
      const { user } = await userRes.json();
      const resolvedUserId: string = user.userId;

      // 6 — create wallet session
      let resolvedSessionId: string | null = null;
      try {
        const sessRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: resolvedUserId, address: userAddress }),
        });
        const { session } = await sessRes.json();
        resolvedSessionId = session?.sessionId ?? null;
      } catch (e) {
        console.error('Failed to create session:', e);
      }

      // 7 — persist everything to state + localStorage
      setAddress(userAddress);
      setUserId(resolvedUserId);
      setUserData(user);
      if (resolvedSessionId) setSessionId(resolvedSessionId);

      localStorage.setItem('devrelive_address', userAddress);
      localStorage.setItem('devrelive_userId', resolvedUserId);
      if (resolvedSessionId) localStorage.setItem('devrelive_sessionId', resolvedSessionId);

    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    // End wallet session in the background
    const currentSessionId = sessionId ?? localStorage.getItem('devrelive_sessionId');
    if (currentSessionId) {
      fetch(`/api/sessions/${currentSessionId}/end`, { method: 'PUT' })
        .catch(() => {});
    }

    setAddress(null);
    setUserId(null);
    setUserData(null);
    setSessionId(null);

    localStorage.removeItem('devrelive_address');
    localStorage.removeItem('devrelive_userId');
    localStorage.removeItem('devrelive_sessionId');

    sdkInstance = null;
  }, [sessionId]);

  return (
    <AuthContext.Provider value={{ address, userId, userData, sessionId, isLoading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
