import React, { useEffect, useState } from 'react';
import { User, Clock, MessageSquare, Calendar, ChevronDown, ChevronUp, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SavedCall {
  id: string;
  channelName: string;
  date: string;
  transcript: { role: 'user' | 'ai'; text: string }[];
}

export function ProfileView() {
  const [calls, setCalls] = useState<SavedCall[]>([]);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const { address, signIn, signOut } = useAuth();

  useEffect(() => {
    const savedCalls = JSON.parse(localStorage.getItem('devrelive_calls') || '[]');
    
    // Add mock data if no calls exist
    if (savedCalls.length === 0) {
      const mockCalls: SavedCall[] = [
        {
          id: 'mock-1',
          channelName: 'Smart Contracts',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          transcript: [
            { role: 'user', text: 'I am having trouble deploying my ERC20 token to Base Sepolia.' },
            { role: 'ai', text: 'I can help with that. Are you using Hardhat or Foundry?' },
            { role: 'user', text: 'I am using Foundry. It says "insufficient funds".' },
            { role: 'ai', text: 'You need some testnet ETH on Base Sepolia to deploy. You can get some from the Coinbase Faucet at faucet.coinbase.com.' }
          ]
        },
        {
          id: 'mock-2',
          channelName: 'Account Abstraction',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
          transcript: [
            { role: 'user', text: 'How do I set up a paymaster for my users?' },
            { role: 'ai', text: 'To set up a paymaster, you can use services like Coinbase Developer Platform, Biconomy, or Pimlico. Which one are you looking to integrate?' },
            { role: 'user', text: 'I want to use CDP.' },
            { role: 'ai', text: 'Great choice. With CDP, you can use the Paymaster API. First, you need to create a project in the CDP portal and get your API key.' }
          ]
        }
      ];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCalls(mockCalls);
    } else {
      // Sort by newest first
      savedCalls.sort((a: SavedCall, b: SavedCall) => new Date(b.date).getTime() - new Date(a.date).getTime());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCalls(savedCalls);
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedCallId(prev => prev === id ? null : id);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/10 bg-zinc-900/30 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <User className="w-10 h-10 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Developer Profile</h1>
            {address ? (
              <p className="text-zinc-400 mt-1 font-mono text-sm">{address.slice(0, 6)}...{address.slice(-4)}</p>
            ) : (
              <p className="text-zinc-400 mt-1">Sign in to view your profile and history.</p>
            )}
          </div>
        </div>
        
        {address ? (
          <button 
            onClick={signOut}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <button 
            onClick={signIn}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center gap-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20"
          >
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
            <button 
              onClick={signIn}
              className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 transition-colors inline-flex items-center gap-2 font-medium text-white shadow-lg shadow-indigo-500/20"
            >
              <LogIn className="w-5 h-5" />
              Sign In with Base
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{calls.length}</div>
                  <div className="text-sm text-zinc-400">Total Calls</div>
                </div>
              </div>
              
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {calls.reduce((acc, call) => acc + call.transcript.length, 0)}
                  </div>
                  <div className="text-sm text-zinc-400">Messages Exchanged</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {calls.length > 0 ? new Date(calls[0].date).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-sm text-zinc-400">Last Active</div>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Activity History & Transcripts
              </h2>
              
              {calls.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-white/5">
                  <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-zinc-300">No calls yet</h3>
                  <p className="text-zinc-500 mt-2">Your call transcripts will appear here after you complete a session.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calls.map((call) => (
                    <div key={call.id} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden transition-all">
                      <button 
                        onClick={() => toggleExpand(call.id)}
                        className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{call.channelName}</h3>
                            <p className="text-sm text-zinc-400">
                              {new Date(call.date).toLocaleString()} • {call.transcript.length} messages
                            </p>
                          </div>
                        </div>
                        {expandedCallId === call.id ? (
                          <ChevronUp className="w-5 h-5 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-zinc-500" />
                        )}
                      </button>
                      
                      {expandedCallId === call.id && (
                        <div className="p-6 border-t border-white/5 bg-zinc-950/50 space-y-4 max-h-[500px] overflow-y-auto">
                          {call.transcript.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'ai' ? 'items-start' : 'items-end'}`}>
                              <div className="text-xs text-zinc-500 mb-1 px-1">
                                {msg.role === 'ai' ? 'DevRel Assistant' : 'You'}
                              </div>
                              <div className={`max-w-[85%] rounded-xl p-3 text-sm ${
                                msg.role === 'ai' 
                                  ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30' 
                                  : 'bg-zinc-800 text-zinc-300 border border-white/10'
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
