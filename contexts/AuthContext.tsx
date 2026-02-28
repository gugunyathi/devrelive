'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  address: string | null;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for existing session on mount
    const savedAddress = localStorage.getItem('devrelive_address');
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  const signIn = () => {
    // In a real app, this would trigger the Base Account sign-in flow
    // For now, we'll simulate a successful sign-in with a mock address
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';
    setAddress(mockAddress);
    localStorage.setItem('devrelive_address', mockAddress);
  };

  const signOut = () => {
    setAddress(null);
    localStorage.removeItem('devrelive_address');
  };

  return (
    <AuthContext.Provider value={{ address, signIn, signOut }}>
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
