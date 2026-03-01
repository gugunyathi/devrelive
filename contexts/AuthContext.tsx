'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createBaseAccountSDK } from '@base-org/account';

interface AuthContextType {
  address: string | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedAddress = localStorage.getItem('devrelive_address');
    if (savedAddress) setAddress(savedAddress);
  }, []);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    try {
      const provider = getSDK().getProvider();

      // 1 — fetch nonce from server (prevents reuse attacks)
      const { nonce } = await fetch('/api/auth/nonce').then(r => r.json());

      // 2 — switch to Base Mainnet
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      } catch {
        // Non-fatal — some wallets don't support this method
      }

      // 3 — connect + sign-in with Ethereum
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

      // 4 — verify signature server-side
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress, message, signature }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error ?? 'Signature verification failed');
      }

      // 5 — persist session
      setAddress(userAddress);
      localStorage.setItem('devrelive_address', userAddress);

      // 6 — upsert user in MongoDB
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: userAddress }),
        });
      } catch (dbErr) {
        console.error('Failed to save user to DB:', dbErr);
      }
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setAddress(null);
    localStorage.removeItem('devrelive_address');
    sdkInstance = null;
  }, []);

  return (
    <AuthContext.Provider value={{ address, isLoading, signIn, signOut }}>
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
