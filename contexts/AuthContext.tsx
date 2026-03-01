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

      // 1 — Connect wallet and get address via viem createWalletClient
      const { createWalletClient, custom } = await import('viem');
      const { base } = await import('viem/chains');

      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider),
      });

      const [userAddress] = await walletClient.getAddresses();

      // 2 — Server-issued nonce (replay-safe)
      const { nonce } = await fetch('/api/auth/nonce').then(r => r.json());

      // 3 — Build SIWE message and sign it
      const domain = typeof window !== 'undefined' ? window.location.host : 'devrelive.vercel.app';
      const uri = typeof window !== 'undefined' ? window.location.origin : 'https://devrelive.vercel.app';
      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        userAddress,
        '',
        'Sign in to DevReLive',
        '',
        `URI: ${uri}`,
        'Version: 1',
        'Chain ID: 8453',
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');

      const signature = await walletClient.signMessage({ account: userAddress, message });

      // 4 — Server-side signature verification
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress, message, signature }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error ?? 'Signature verification failed');
      }

      // 5 — Upsert user in MongoDB — get back userId
      const userRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress }),
      });
      const { user } = await userRes.json();
      const resolvedUserId: string = user.userId;

      // 6 — Create wallet session
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

      // 7 — Persist to state + localStorage
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
