import React from 'react';
import { Phone, Hash, Code, Server, User, Box, Bot, MessageSquare, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

export interface Channel {
  id: string;
  name: string;
  icon: React.ReactNode;
  number: string;
  context?: string;
}

export const CHANNELS: Channel[] = [
  { id: 'base-chain', name: 'Base Chain', icon: <Hash className="w-5 h-5" />, number: '0x1' },
  { id: 'base-nodes', name: 'Base Nodes', icon: <Server className="w-5 h-5" />, number: '0x2' },
  { id: 'base-account', name: 'Base Account', icon: <User className="w-5 h-5" />, number: '0x3' },
  { id: 'mini-apps', name: 'Mini Apps', icon: <Box className="w-5 h-5" />, number: '0x4' },
  { id: 'ai-agents', name: 'AI Agents', icon: <Bot className="w-5 h-5" />, number: '0x5' },
  { id: 'dev-forum', name: 'Developer Forum', icon: <MessageSquare className="w-5 h-5" />, number: '0x6' },
];

interface CallPadProps {
  onCall: (channel: Channel) => void;
  activeChannelId?: string;
}

export function CallPad({ onCall, activeChannelId }: CallPadProps) {
  const { address } = useAuth();

  return (
    <div className="w-80 bg-zinc-950 border-r border-white/10 h-full flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Code className="w-6 h-6 text-indigo-500" />
          DevReLive
        </h1>
        <p className="text-zinc-400 text-sm mt-2">
          Live developer assistance for Base. Select a channel to dial.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {CHANNELS.map((channel) => {
          const isActive = activeChannelId === channel.id;
          const isDisabled = !address;
          return (
            <motion.button
              whileHover={{ scale: isDisabled ? 1 : 1.02 }}
              whileTap={{ scale: isDisabled ? 1 : 0.98 }}
              key={channel.id}
              onClick={() => !isDisabled && onCall(channel)}
              disabled={isDisabled}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                isActive
                  ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                  : isDisabled
                    ? 'bg-zinc-900/50 border-white/5 opacity-50 cursor-not-allowed text-zinc-500'
                    : 'bg-zinc-900 border-white/5 text-zinc-300 hover:bg-zinc-800 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isActive ? 'bg-indigo-500/20' : isDisabled ? 'bg-zinc-800/50' : 'bg-zinc-800'
                  }`}
                >
                  {isDisabled ? <Lock className="w-5 h-5" /> : channel.icon}
                </div>
                <div className="text-left">
                  <div className={`font-medium ${isDisabled ? 'text-zinc-500' : 'text-white'}`}>{channel.name}</div>
                  <div className="text-xs font-mono text-zinc-500 mt-0.5">
                    Dial {channel.number}
                  </div>
                </div>
              </div>
              {!isDisabled && (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {!address ? (
        <div className="p-4 border-t border-white/10 bg-zinc-900/50 text-center">
          <Lock className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Sign in to make calls</p>
        </div>
      ) : (
        <div className="p-4 border-t border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
        </div>
      )}
    </div>
  );
}
