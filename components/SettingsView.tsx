'use client';

import React from 'react';
import { User, Plug, Shield, LogIn, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SignInWithBaseButton } from '@base-org/account-ui/react';

interface SettingsViewProps {
  onNavigate: (tab: 'profile' | 'integrations' | 'admin') => void;
}

const SETTINGS_TILES = [
  {
    id: 'profile' as const,
    label: 'Profile',
    description: 'View your activity, call history, and transcripts',
    icon: User,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    id: 'integrations' as const,
    label: 'Connect',
    description: 'Link GitHub, Telegram, and other integrations',
    icon: Plug,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    id: 'admin' as const,
    label: 'Admin',
    description: 'Manage calls, issues, costs, and analytics',
    icon: Shield,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
];

export function SettingsView({ onNavigate }: SettingsViewProps) {
  const { address, signIn, signOut } = useAuth();

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/10">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your account and app configuration</p>
      </div>

      {/* Auth section */}
      <div className="px-6 py-5 border-b border-white/5">
        {address ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Connected</p>
                <p className="text-xs font-mono text-zinc-400">{address.slice(0, 6)}…{address.slice(-4)}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-300"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-zinc-400">Sign in with your Base wallet to unlock all features.</p>
            <div>
              <SignInWithBaseButton
                colorScheme="dark"
                onClick={signIn}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation tiles */}
      <div className="px-6 py-6 flex flex-col gap-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Pages</p>
        {SETTINGS_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => onNavigate(tile.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-white/5 hover:bg-zinc-800/60 hover:border-white/10 transition-all text-left group"
            >
              <div className={`w-12 h-12 rounded-xl ${tile.bg} border ${tile.border} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${tile.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{tile.label}</p>
                <p className="text-sm text-zinc-400 mt-0.5 truncate">{tile.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
