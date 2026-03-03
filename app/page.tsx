'use client';

import React, { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { CallPad, Channel } from '@/components/CallPad';
import { ActiveCall } from '@/components/ActiveCall';
import { Integrations } from '@/components/Integrations';
import { DiscordView } from '@/components/DiscordView';
import { CalendarView } from '@/components/CalendarView';
import { RepairView } from '@/components/RepairView';
import { ProfileView } from '@/components/ProfileView';
import { AdminView } from '@/components/AdminView';
import { Bot, Code2, PhoneCall, ShieldCheck, Zap, Plug, Phone, MessageSquare, Calendar, Wrench, User, Shield, LogOut, LogIn, LockKeyhole } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { SignInWithBaseButton } from '@base-org/account-ui/react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'discord' | 'call' | 'calendar' | 'integrations' | 'repair' | 'profile' | 'admin'>('discord');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, boolean>>({});
  const { address, signIn, signOut, isLoading } = useAuth();
  const [isJoinedViaLink, setIsJoinedViaLink] = useState(false);

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      const urlParams = new URLSearchParams(window.location.search);
      const callId = urlParams.get('call');
      if (callId && !activeChannel) {
        const { CHANNELS } = require('@/components/CallPad');
        const channel = CHANNELS.find((c: Channel) => c.id === callId) || {
          id: callId,
          name: 'Shared Call',
          icon: <Phone className="w-5 h-5" />,
          number: 'Shared'
        };
        setActiveChannel(channel);
        setActiveTab('call');
        setIsJoinedViaLink(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [address, activeChannel]);

  const handleCall = (channel: Channel) => {
    if (!address) {
      // Redirect to sign-in gate — user will see the lock screen on the calls tab
      setActiveTab('call');
      return;
    }
    setActiveChannel(channel);
    setActiveTab('call');
  };

  // Reusable sign-in gate for locked sections
  const SignInGate = ({ label }: { label: string }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-zinc-950">
      <div className="p-4 bg-zinc-900 rounded-full">
        <LockKeyhole className="w-10 h-10 text-zinc-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-1">Sign in to access {label}</h3>
        <p className="text-zinc-400 text-sm">Connect your Base account to unlock this feature.</p>
      </div>
      <SignInWithBaseButton
        align="center"
        variant="solid"
        colorScheme="dark"
        onClick={signIn}
      />
    </div>
  );

  const handleEndCall = () => {
    setActiveChannel(null);
  };

  // Nav item definition for reuse across desktop sidebar and mobile bottom bar
  const NAV_ITEMS = [
    { id: 'discord' as const, label: 'Discord', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
      </svg>
    )},
    { id: 'repair' as const, label: 'Repair', icon: <Wrench className="w-5 h-5" /> },
    { id: 'call' as const, label: 'Calls', icon: <Phone className="w-5 h-5" /> },
    { id: 'calendar' as const, label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
    { id: 'integrations' as const, label: 'Connect', icon: <Plug className="w-5 h-5" /> },
    { id: 'profile' as const, label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'admin' as const, label: 'Admin', icon: <Shield className="w-5 h-5" /> },
  ];

  return (
    <main className="flex h-[100dvh] w-full bg-black text-white overflow-hidden font-sans" suppressHydrationWarning>
      {/* ── Desktop / Tablet Left Navigation (hidden on mobile) ── */}
      <div className="hidden md:flex w-16 lg:w-20 bg-zinc-950 border-r border-white/10 flex-col items-center py-4 lg:py-6 gap-6 lg:gap-8 z-20 shrink-0">
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Bot className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
        </div>
        
        <div className="flex flex-col gap-3 lg:gap-4 w-full px-2 lg:px-3 flex-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                activeTab === item.id
                  ? item.id === 'discord' ? 'bg-[#5865F2]/20 text-[#5865F2]' : 'bg-indigo-500/20 text-indigo-400'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Auth Button */}
        <div className="w-full px-2 lg:px-3 pb-4">
          {address ? (
            <button
              onClick={signOut}
              className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-colors text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-medium">Sign Out</span>
            </button>
          ) : (
            <button
              onClick={signIn}
              className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-colors bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
              title="Sign In with Base"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-[10px] font-medium text-center leading-tight">Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main column (header + content) ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">

        {/* Top Header Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 md:px-6 py-2 md:py-3 border-b border-white/5 bg-zinc-950 z-10">
          <div className="flex items-center gap-2">
            {/* Logo visible on mobile where left nav is hidden */}
            <div className="flex md:hidden w-8 h-8 bg-indigo-500 rounded-lg items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-zinc-500 tracking-wide">DevReLive</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {address ? (
              <>
                <span className="hidden sm:inline text-xs font-mono text-zinc-400 bg-zinc-900 px-2 md:px-3 py-1.5 rounded-lg border border-white/5">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
                <button
                  onClick={signOut}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 md:px-3 py-1.5 rounded-lg hover:bg-zinc-800"
                >
                  Sign out
                </button>
              </>
            ) : (
              <SignInWithBaseButton
                align="center"
                variant="solid"
                colorScheme="dark"
                onClick={signIn}
              />
            )}
          </div>
        </div>

        {/* ── Calls layout: CallPad sidebar + content side-by-side on md+ ── */}
        <div className="flex-1 flex min-h-0">
          {/* CallPad: full width on mobile (when no active call), sidebar on md+ */}
          {activeTab === 'call' && (
            <div className={`${activeChannel ? 'hidden md:flex' : 'flex w-full md:w-80'} flex-shrink-0`}>
              <CallPad onCall={handleCall} activeChannelId={activeChannel?.id} />
            </div>
          )}

          {/* Content pane — hidden on mobile when CallPad takes full width (calls tab, no active channel) */}
          <div className={`flex-1 relative min-w-0 ${activeTab === 'call' && !activeChannel ? 'hidden md:block' : ''} pb-14 md:pb-0`}>
        <AnimatePresence mode="wait">
          {activeTab === 'discord' ? (
            <motion.div
              key="discord"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <DiscordView 
                isTelegramConnected={connectedIntegrations['telegram'] || false}
                onStartCall={(title, context) => handleCall({ 
                id: 'discord-' + Date.now(), 
                name: title.length > 20 ? title.substring(0, 20) + '...' : title, 
                icon: <MessageSquare className="w-5 h-5" />, 
                number: 'Discord User',
                context: context
              })} />
            </motion.div>
          ) : activeTab === 'repair' ? (
            <motion.div
              key="repair"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <RepairView />
            </motion.div>
          ) : activeTab === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {!address ? <SignInGate label="Calendar" /> : <CalendarView />}
            </motion.div>
          ) : activeTab === 'integrations' ? (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {!address ? <SignInGate label="Integrations" /> : <Integrations connected={connectedIntegrations} setConnected={setConnectedIntegrations} />}
            </motion.div>
          ) : activeTab === 'profile' ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {!address ? <SignInGate label="Profile" /> : <ProfileView />}
            </motion.div>
          ) : activeTab === 'admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {!address ? <SignInGate label="Admin" /> : <AdminView />}
            </motion.div>
          ) : activeTab === 'call' && !address ? (
            <motion.div
              key="call-gate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <SignInGate label="Calls" />
            </motion.div>
          ) : activeChannel ? (
            <motion.div
              key="active-call"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <ActiveCall channel={activeChannel} onEndCall={handleEndCall} isJoinedViaLink={isJoinedViaLink} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 bg-zinc-950 overflow-y-auto"
            >
              <div className="max-w-3xl w-full text-center space-y-4 sm:space-y-8">
                <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-indigo-500/10 rounded-full mb-2 sm:mb-4">
                  <Bot className="w-10 h-10 sm:w-16 sm:h-16 text-indigo-500" />
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                  Welcome to <span className="text-indigo-400">DevReLive</span>
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                  The live call center for developers on Base. Get direct assistance with your builds, code, and apps through real-time voice, video, and screensharing.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-12 text-left">
                  <div className="p-4 sm:p-6 rounded-2xl bg-zinc-900 border border-white/5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 sm:mb-4">
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Instant Debugging</h3>
                    <p className="text-zinc-400 text-sm">Share your screen and get immediate feedback from our AI DevRel assistants.</p>
                  </div>

                  <div className="p-4 sm:p-6 rounded-2xl bg-zinc-900 border border-white/5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 mb-3 sm:mb-4">
                      <Code2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Code Context</h3>
                    <p className="text-zinc-400 text-sm">Our AI reads your code in real-time to provide accurate, context-aware solutions.</p>
                  </div>

                  <div className="p-4 sm:p-6 rounded-2xl bg-zinc-900 border border-white/5 sm:col-span-2 md:col-span-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3 sm:mb-4">
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Channel Specific</h3>
                    <p className="text-zinc-400 text-sm">Dial directly into specific Base channels like Nodes, Mini Apps, or Account Abstraction.</p>
                  </div>
                </div>

                <div className="mt-6 sm:mt-12 p-4 sm:p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-left">
                    <h4 className="text-base sm:text-lg font-medium text-white">Ready to debug?</h4>
                    <p className="text-zinc-400 text-sm mt-1">Select a channel from the Call Pad to start your session.</p>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-400 font-medium shrink-0">
                    <PhoneCall className="w-5 h-5 animate-pulse" />
                    Waiting for call...
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </div>{/* content pane */}
        </div>{/* calls-row */}
      </div>{/* main column */}

      {/* ── Mobile Bottom Navigation (hidden on md+) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] z-50">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg transition-colors flex-1 min-w-0 ${
              activeTab === item.id
                ? item.id === 'discord' ? 'text-[#5865F2]' : 'text-indigo-400'
                : 'text-zinc-500'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">{item.icon}</div>
            <span className="text-[9px] font-medium truncate w-full text-center">{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
