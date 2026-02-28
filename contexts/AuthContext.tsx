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

function generateNonce() {
  return window.crypto.randomUUID().replace(/-/g, '');
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
      const nonce = generateNonce();

      const { accounts } = await provider.request({
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
      });

      const { address: userAddress } = accounts[0];
      setAddress(userAddress);
      localStorage.setItem('devrelive_address', userAddress);

      // Save user to database
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: userAddress }),
        });
      } catch (dbErr) {
        console.error('Failed to save user to DB:', dbErr);
      }

      // Log auth data for optional backend verification
      const { message, signature } = accounts[0].capabilities.signInWithEthereum;
      console.log('Base Account auth:', { address: userAddress, message, signature });
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setAddress(null);
    localStorage.removeItem('devrelive_address');
    sdkInstance = null; // reset SDK so a fresh provider is created on next sign-in
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
