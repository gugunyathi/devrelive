'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { User, Clock, MessageSquare, Calendar, ChevronDown, ChevronUp, LogOut, LogIn, RefreshCw, BadgeCheck, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TranscriptEntry {
  role: 'user' | 'ai' | 'devrel' | 'guest';
  text: string;
  timestamp?: string;
}

interface SavedCall {
  id: string;
  callId?: string;
  channelName: string;
  date: string;
  duration?: number;
  status?: string;
  hasHumanDevRel?: boolean;
  transcript: TranscriptEntry[];
}

// Mock call data shown when the user has no real history yet
const MOCK_CALLS: SavedCall[] = [
  {
    id: 'mock-1',
    channelName: 'Smart Contracts',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    duration: 420,
    status: 'ended',
    transcript: [
      { role: 'user', text: 'I am having trouble deploying my ERC20 token to Base Sepolia.' },
      { role: 'ai', text: 'I can help with that. Are you using Hardhat or Foundry?' },
      { role: 'user', text: 'I am using Foundry. It says "insufficient funds".' },
      { role: 'ai', text: 'You need testnet ETH on Base Sepolia. Get it at faucet.coinbase.com.' },
    ],
  },
  {
    id: 'mock-2',
    channelName: 'Account Abstraction',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    duration: 810,
    status: 'ended',
    transcript: [
      { role: 'user', text: 'How do I set up a paymaster for my users?' },
      { role: 'ai', text: 'You can use CDP, Biconomy, or Pimlico. Which are you targeting?' },
      { role: 'user', text: 'I want to use CDP.' },
      { role: 'ai', text: 'Create a project in the CDP portal, get your API key, then use the Paymaster API.' },
    ],
  },
];

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ProfileView() {
  const { address, userId, userData, signIn, signOut, refreshUser } = useAuth();
  const [calls, setCalls] = useState<SavedCall[]>([]);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);

  // Merge API call history with localStorage
  const loadCalls = useCallback(async () => {
    if (!address) return;
    setIsLoadingCalls(true);
    try {
      const res = await fetch(`/api/users/${address}/history?limit=50`);
      const localRaw: SavedCall[] = JSON.parse(localStorage.getItem('devrelive_calls') || '[]');

      if (res.ok) {
        const { calls: apiCalls } = await res.json();
        const normalised: SavedCall[] = (apiCalls as Record<string, unknown>[]).map((c) => ({
          id: (c.callId as string) || String(c._id),
          callId: c.callId as string,
          channelName: c.channelName as string,
          date: String(c.startTime),
          duration: c.duration as number,
          status: c.status as string,
          hasHumanDevRel: c.hasHumanDevRel as boolean,
          transcript: (c.transcript as TranscriptEntry[]) ?? [],
        }));
        const apiIds = new Set(normalised.map(c => c.id));
        const localOnly = localRaw.filter(c => !apiIds.has(c.id));
        const merged = [...normalised, ...localOnly].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setCalls(merged.length > 0 ? merged : MOCK_CALLS);
      } else {
        const sorted = localRaw.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCalls(sorted.length > 0 ? sorted : MOCK_CALLS);
      }
    } catch {
      const localRaw: SavedCall[] = JSON.parse(localStorage.getItem('devrelive_calls') || '[]');
      setCalls(localRaw.length > 0 ? localRaw : MOCK_CALLS);
    } finally {
      setIsLoadingCalls(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) loadCalls();
  }, [address, loadCalls]);

  const toggleExpand = (id: string) => setExpandedCallId(prev => (prev === id ? null : id));

  const totalCalls = userData?.stats.totalCalls ?? calls.length;
  const totalMessages = userData?.stats.totalMessages ?? calls.reduce((a, c) => a + c.transcript.length, 0);
  const lastActive =
    userData?.lastSeenAt
      ? new Date(userData.lastSeenAt).toLocaleDateString()
      : calls.length > 0
        ? new Date(calls[0].date).toLocaleDateString()
        : 'N/A';

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/10 bg-zinc-900/30 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <User className="w-10 h-10 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {userData?.username ?? 'Developer Profile'}
              </h1>
              {userData?.isAdmin && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                  <BadgeCheck className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
            {address ? (
              <>
                <p className="text-zinc-400 mt-1 font-mono text-sm">{address.slice(0, 6)}…{address.slice(-4)}</p>
                {userId && <p className="text-zinc-600 text-xs mt-0.5 font-mono">{userId}</p>}
              </>
            ) : (
              <p className="text-zinc-400 mt-1">Sign in to view your profile and history.</p>
            )}
          </div>
        </div>

        {address ? (
          <div className="flex items-center gap-3">
            <button onClick={refreshUser} className="px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors" title="Refresh profile">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={signOut} className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm font-medium">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          <button onClick={signIn} className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center gap-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20">
            <LogIn className="w-4 h-4" />
            Sign In with Base
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {!address ? (
          <div className="max-w-md mx-auto mt-20 text-center p-8 rounded-2xl bg-zinc-900/50 border border-white/5">
            <User className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Not Signed In</h2>
            <p className="text-zinc-400 mb-6">Connect your wallet to view your call history, transcripts, and developer stats.</p>
            <button onClick={signIn} className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 transition-colors inline-flex items-center gap-2 font-medium text-white shadow-lg shadow-indigo-500/20">
              <LogIn className="w-5 h-5" />
              Sign In with Base
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalCalls}</div>
                  <div className="text-sm text-zinc-400">Total Calls</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalMessages}</div>
                  <div className="text-sm text-zinc-400">Messages Exchanged</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{lastActive}</div>
                  <div className="text-sm text-zinc-400">Last Active</div>
                </div>
              </div>
            </div>

            {userData && userData.stats.totalDuration > 0 && (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400 shrink-0" />
                <span className="text-sm text-zinc-300">
                  You have spent <strong>{formatDuration(userData.stats.totalDuration)}</strong> in DevRel sessions — keep building on Base!
                </span>
              </div>
            )}

            {/* Call History */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  Activity History &amp; Transcripts
                </h2>
                <button onClick={loadCalls} disabled={isLoadingCalls} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                  <RefreshCw className={`w-3 h-3 ${isLoadingCalls ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {isLoadingCalls ? (
                <div className="text-center py-12 text-zinc-500 animate-pulse">Loading history…</div>
              ) : calls.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-white/5">
                  <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-300">No calls yet</h3>
                  <p className="text-zinc-500 mt-2">Your call transcripts will appear here after you complete a session.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calls.map((call) => (
                    <div key={call.id} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
                      <button onClick={() => toggleExpand(call.id)} className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/50 transition-colors text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white">{call.channelName}</h3>
                              {call.hasHumanDevRel && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">+ Human DevRel</span>
                              )}
                              {call.status === 'escalated' && (
                                <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/20">Escalated</span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-400">
                              {new Date(call.date).toLocaleString()} · {call.transcript.length} messages
                              {call.duration ? ` · ${formatDuration(call.duration)}` : ''}
                            </p>
                          </div>
                        </div>
                        {expandedCallId === call.id ? <ChevronUp className="w-5 h-5 text-zinc-500 shrink-0" /> : <ChevronDown className="w-5 h-5 text-zinc-500 shrink-0" />}
                      </button>

                      {expandedCallId === call.id && (
                        <div className="p-6 border-t border-white/5 bg-zinc-950/50 space-y-4 max-h-[500px] overflow-y-auto">
                          {call.transcript.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                              <div className="text-xs text-zinc-500 mb-1 px-1">
                                {msg.role === 'ai' ? 'DevRel AI' : msg.role === 'devrel' ? 'Human DevRel' : 'You'}
                              </div>
                              <div className={`max-w-[85%] rounded-xl p-3 text-sm ${
                                msg.role === 'user'
                                  ? 'bg-zinc-800 text-zinc-300 border border-white/10'
                                  : msg.role === 'devrel'
                                    ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30'
                                    : 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
