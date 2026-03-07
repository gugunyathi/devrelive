import React, { useState, useEffect, useRef } from 'react';
import { Github, Slack, Twitter, MessageCircle, MessageSquare, Link as LinkIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

const INTEGRATIONS = [
  { id: 'discord', name: 'Discord', icon: <MessageSquare className="w-6 h-6" />, description: 'Connect to Base Discord servers and channels.', color: 'bg-[#5865F2]' },
  { id: 'github', name: 'GitHub', icon: <Github className="w-6 h-6" />, description: 'Link repositories, issues, and pull requests.', color: 'bg-[#24292e]' },
  { id: 'twitter', name: 'X (Twitter)', icon: <Twitter className="w-6 h-6" />, description: 'Monitor mentions, hashtags, and DMs.', color: 'bg-black border border-white/20' },
  { id: 'telegram', name: 'Telegram', icon: <MessageCircle className="w-6 h-6" />, description: 'Connect Telegram groups and bots.', color: 'bg-[#229ED9]' },
  { id: 'whatsapp', name: 'WhatsApp', icon: <MessageCircle className="w-6 h-6" />, description: 'WhatsApp Business API integration.', color: 'bg-[#25D366]' },
  { id: 'slack', name: 'Slack', icon: <Slack className="w-6 h-6" />, description: 'Sync with your team\'s Slack workspaces.', color: 'bg-[#E01E5A]' },
  { id: 'reddit', name: 'Reddit', icon: <MessageSquare className="w-6 h-6" />, description: 'Monitor subreddits and community feedback.', color: 'bg-[#FF4500]' },
];

export function Integrations({ connected, setConnected }: { connected: Record<string, boolean>, setConnected: React.Dispatch<React.SetStateAction<Record<string, boolean>>> }) {
  const { address } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [telegramPending, setTelegramPending] = useState<{ token: string; botUrl: string } | null>(null);
  const [integrationMeta, setIntegrationMeta] = useState<Record<string, Record<string, unknown>>>({});
  const telegramPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted integration state from API on mount
  useEffect(() => {
    if (!address) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/integrations?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.connected && Object.keys(data.connected).length > 0) {
            setConnected(prev => ({ ...prev, ...data.connected }));
          }
          if (data.meta) setIntegrationMeta(data.meta);
        }
      } catch {
        // Use local state as fallback
      }
    };
    load();
  }, [address, setConnected]);

  const handleConnect = async (id: string) => {
    const isConnecting = !connected[id];

    if (connected[id]) {
      setConnected(prev => ({ ...prev, [id]: false }));
      setIntegrationMeta(prev => { const next = { ...prev }; delete next[id]; return next; });
      // Persist disconnect
      if (address) {
        try {
          await fetch('/api/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, integrationId: id, connected: false }),
          });
        } catch { /* ignore */ }
      }
      return;
    }

    setConnecting(id);

    // Telegram: use real bot deep-link + polling
    if (id === 'telegram') {
      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        if (data.token && data.botUrl) {
          setTelegramPending({ token: data.token, botUrl: data.botUrl });
          window.open(data.botUrl, '_blank', 'noopener,noreferrer');
          // Poll every 2s for up to 5 min
          telegramPollRef.current = setInterval(async () => {
            try {
              const poll = await fetch(`/api/auth/telegram?token=${data.token}`);
              const pollData = await poll.json();
              if (pollData.status === 'confirmed') {
                clearInterval(telegramPollRef.current!);
                setTelegramPending(null);
                setConnecting(null);
                setConnected(prev => ({ ...prev, telegram: true }));
                const meta = {
                  telegramUserId: pollData.telegramUserId,
                  telegramUsername: pollData.telegramUsername ?? null,
                  telegramFirstName: pollData.telegramFirstName ?? null,
                };
                setIntegrationMeta(prev => ({ ...prev, telegram: meta }));
                if (address) {
                  await fetch('/api/integrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address, integrationId: 'telegram', connected: true, meta }),
                  }).catch(() => {});
                }
              } else if (pollData.status === 'expired') {
                clearInterval(telegramPollRef.current!);
                setTelegramPending(null);
                setConnecting(null);
              }
            } catch { /* ignore */ }
          }, 2000);
          // Stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(telegramPollRef.current!);
            setTelegramPending(null);
            setConnecting(null);
          }, 5 * 60 * 1000);
        }
      } catch {
        setConnecting(null);
      }
      return;
    }

    // Other integrations: simulate OAuth delay
    setTimeout(async () => {
      setConnected(prev => ({ ...prev, [id]: true }));
      setConnecting(null);
      // Persist connect
      if (address) {
        try {
          await fetch('/api/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, integrationId: id, connected: true }),
          });
        } catch { /* ignore */ }
      }
    }, 1500);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-zinc-950 p-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Integrations</h1>
          <p className="text-zinc-400 text-lg">
            Connect DevReLive to your favorite platforms to monitor issues, reply to developers, and sync context across channels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INTEGRATIONS.map((integration) => {
            const isConnected = connected[integration.id];
            const isConnecting = connecting === integration.id;
            const meta = integrationMeta[integration.id] ?? {};
            const tgUsername = integration.id === 'telegram'
              ? (meta.telegramUsername as string | undefined) ?? (meta.telegramFirstName as string | undefined)
              : undefined;

            return (
              <motion.div
                key={integration.id}
                whileHover={{ y: -4 }}
                className="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col h-full relative overflow-hidden"
              >
                {isConnected && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                )}
                
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg ${integration.color}`}>
                    {integration.icon}
                  </div>
                  
                {isConnected && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-white mb-2">{integration.name}</h3>
                <p className="text-zinc-400 text-sm flex-1 mb-3">
                  {integration.description}
                </p>

                {/* Telegram: show connected account */}
                {integration.id === 'telegram' && isConnected && tgUsername && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/20 text-xs text-[#229ED9]">
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium truncate">
                      {tgUsername.startsWith('@') ? tgUsername : `@${tgUsername}`}
                    </span>
                  </div>
                )}

                {integration.id === 'telegram' && telegramPending && (
                  <div className="mb-4 p-3 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/30 text-xs text-[#229ED9] leading-relaxed">
                    <p className="font-semibold mb-1">1. Telegram opened — don&apos;t close it.</p>
                    <p>2. Tap <strong>START</strong> in the bot chat to confirm the connection.</p>
                    <p className="mt-1 text-zinc-500">Waiting for confirmation…</p>
                  </div>
                )}

                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnecting}
                  className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    isConnected
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-white/5'
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : isConnected ? (
                    'Disconnect'
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Connect
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
