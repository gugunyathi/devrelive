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

      // 1 — Prefetch nonce from server (replay-safe, stored in MongoDB)
      const { nonce } = await fetch('/api/auth/nonce').then(r => r.json());

      // 2 — Authenticate via Base Account's wallet_connect + signInWithEthereum capability
      //     (EIP-4361 SIWE message is built and signed by the wallet itself)
      //     Falls back to manual SIWE if wallet doesn't support wallet_connect
      let userAddress: string;
      let message: string;
      let signature: string;

      try {
        const { accounts } = await provider.request({
          method: 'wallet_connect',
          params: [{
            version: '1',
            capabilities: {
              signInWithEthereum: {
                nonce,
                chainId: '0x2105', // Base Mainnet
              },
            },
          }],
        }) as { accounts: Array<{ address: string; capabilities: { signInWithEthereum: { message: string; signature: string } } }> };

        userAddress = accounts[0].address;
        message    = accounts[0].capabilities.signInWithEthereum.message;
        signature  = accounts[0].capabilities.signInWithEthereum.signature;

      } catch (walletConnectErr: unknown) {
        // Fallback for wallets that don't support wallet_connect yet
        const err = walletConnectErr as { code?: number; message?: string };
        if (err?.code !== undefined /* method_not_supported */) {
          const { createAttributedWalletClient } = await import('@/lib/viem-client');
          const walletClient = createAttributedWalletClient(provider);
          const [addr] = await walletClient.getAddresses();
          userAddress = addr;

          const domain = typeof window !== 'undefined' ? window.location.host : 'devrelive.vercel.app';
          const uri    = typeof window !== 'undefined' ? window.location.origin : 'https://devrelive.vercel.app';
          message = [
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
          signature = await walletClient.signMessage({ account: userAddress as `0x${string}`, message });
        } else {
          throw walletConnectErr;
        }
      }

      // 3 — Server-side signature verification (handles ERC-6492 undeployed smart wallets)
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress, message, signature }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error ?? 'Signature verification failed');
      }

      // 4 — Upsert user in MongoDB — get back userId
      const userRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress }),
      });
      const { user } = await userRes.json();
      const resolvedUserId: string = user.userId;

      // 5 — Create wallet session
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

      // 6 — Persist to state + localStorage
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
