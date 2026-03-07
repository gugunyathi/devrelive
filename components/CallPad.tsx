import React, { useState } from 'react';
import { Phone, Hash, Code, Server, User, Box, Bot, MessageSquare, Lock, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { CallGate } from './CallGate';

export interface Channel {
  id: string;
  name: string;
  icon: React.ReactNode;
  number: string;
  context?: string;
  maxDurationSecs?: number;
}

export const CHANNELS: Channel[] = [
  {
    id: 'base-chain', name: 'Base Chain', icon: <Hash className="w-5 h-5" />, number: '0x1',
    context: 'You are a specialist DevRel engineer for Base Chain, an Ethereum L2 built by Coinbase. Help developers with Base transactions, gas fees, bridging assets, smart contract deployment on Base, Base-specific RPC issues, Basescan verification, and the Base ecosystem. Be concise, accurate, and include code snippets where helpful.',
  },
  {
    id: 'base-nodes', name: 'Base Nodes', icon: <Server className="w-5 h-5" />, number: '0x2',
    context: 'You are a specialist DevRel engineer for Base node operations. Help developers with running Base full nodes and archive nodes, Reth and Geth clients, syncing issues, snapshot downloads from docs.base.org, RPC configuration, peer connectivity, and node infrastructure. Reference the official Base node docs where appropriate.',
  },
  {
    id: 'base-account', name: 'Base Account', icon: <User className="w-5 h-5" />, number: '0x3',
    context: 'You are a specialist DevRel engineer for Base Account (formerly Coinbase Smart Wallet). Help developers with account abstraction (ERC-4337), smart wallet creation, paymasters for gas sponsorship, the Base Account SDK, passkey signers, and integrating @base-org/account into their dApps. Be precise and include SDK examples.',
  },
  {
    id: 'mini-apps', name: 'Mini Apps', icon: <Box className="w-5 h-5" />, number: '0x4',
    context: 'You are a specialist DevRel engineer for Farcaster Mini Apps (formerly Frames v2). Help developers with farcaster.json manifests, account association signing, the base:app_id meta tag, the @farcaster/miniapp-sdk, mini app embeds, iconUrl specs (1024x1024 PNG, no alpha), registering on base.dev, and debugging manifest issues on base.dev/preview.',
  },
  {
    id: 'ai-agents', name: 'AI Agents', icon: <Bot className="w-5 h-5" />, number: '0x5',
    context: 'You are a specialist DevRel engineer for AI agents on Base. Help developers with building onchain AI agents using CDP AgentKit, LangChain, LangGraph, and MCP servers. Assist with autonomous agent architecture, wallet actions, gas management for agents, and deploying agents that interact with Base smart contracts.',
  },
  {
    id: 'dev-forum', name: 'Developer Forum', icon: <MessageSquare className="w-5 h-5" />, number: '0x6',
    context: 'You are a helpful DevRel assistant for Base developers. Answer questions about Base L2, Coinbase Developer Platform (CDP), smart contracts, OnchainKit, account abstraction, mini apps, AI agents, and the broader Base ecosystem. Reference official docs at docs.base.org and base.dev. Escalate complex issues to a human DevRel if needed.',
  },
];

interface CallPadProps {
  onCall: (channel: Channel) => void;
  onRepair?: () => void;
  activeChannelId?: string;
}

export function CallPad({ onCall, onRepair, activeChannelId }: CallPadProps) {
  const { address } = useAuth();
  const [pendingChannel, setPendingChannel] = useState<Channel | null>(null);

  return (
    <div className="w-full bg-zinc-950 border-r border-white/10 h-full flex flex-col">
      <CallGate
        open={!!pendingChannel}
        channelName={pendingChannel?.name ?? ''}
        userAddress={address}
        onStart={(maxDurationSecs) => {
          const ch = { ...pendingChannel!, maxDurationSecs };
          setPendingChannel(null);
          onCall(ch);
        }}
        onClose={() => setPendingChannel(null)}
      />
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
            <div key={channel.id} className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                onClick={() => !isDisabled && setPendingChannel(channel)}
                disabled={isDisabled}
                className={`flex-1 flex items-center justify-between p-4 rounded-xl border transition-colors ${
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
              {onRepair && !isDisabled && (
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onRepair}
                  title="Open Code Repair Agent"
                  className="w-10 h-10 shrink-0 rounded-xl border border-white/5 bg-zinc-900 hover:bg-amber-500/10 hover:border-amber-500/30 text-zinc-500 hover:text-amber-400 flex items-center justify-center transition-colors"
                >
                  <Wrench className="w-4 h-4" />
                </motion.button>
              )}
            </div>
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
