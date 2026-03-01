import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { PhoneOff, MonitorUp, MonitorOff, Mic, MicOff, Video, VideoOff, Send, Link as LinkIcon, UserPlus, Users, LogOut } from 'lucide-react';
import { useGeminiLive } from '@/hooks/use-gemini-live';
import { Channel } from './CallPad';
import { useAuth } from '@/contexts/AuthContext';

function useRingbackTone(isConnecting: boolean) {
  useEffect(() => {
    if (!isConnecting) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.value = 0;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 440;
    osc1.connect(gainNode);
    osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 480;
    osc2.connect(gainNode);
    osc2.start();

    let isCancelled = false;

    const playRing = () => {
      if (isCancelled) return;
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now + 2);
      gainNode.gain.linearRampToValueAtTime(0, now + 2.1);
    };

    playRing();
    const intervalId = setInterval(playRing, 4000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      try { osc1.stop(); } catch (e) {}
      try { osc2.stop(); } catch (e) {}
      osc1.disconnect();
      osc2.disconnect();
      gainNode.disconnect();
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    };
  }, [isConnecting]);
}

interface ActiveCallProps {
  channel: Channel;
  onEndCall: () => void;
  isHost?: boolean;
}

export function ActiveCall({ channel, onEndCall, isHost = true }: ActiveCallProps) {
  const { isConnected, isConnecting, error, transcript, connect, disconnect, sendScreenFrame, sendTextMessage } = useGeminiLive(channel.name, channel.context);
  const { address, userId } = useAuth();

  useRingbackTone(isConnecting);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showInviteCopied, setShowInviteCopied] = useState(false);
  const [hasHumanDevRel, setHasHumanDevRel] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; name: string; role: 'host' | 'devrel' | 'guest' }[]>([
    { id: address ?? '1', name: 'You', role: 'host' },
  ]);

  const callStartTime = useRef<Date>(new Date());
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    setIsScreenSharing(false);
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
      stopScreenShare();
    };
  }, [connect, disconnect]);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 }
        }
      });
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);

      // Start capturing frames
      frameIntervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 2000); // 1 frame every 2 seconds

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  };

  const captureAndSendFrame = () => {
    if (!screenVideoRef.current || !canvasRef.current || !isConnected) return;
    
    const video = screenVideoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get base64 jpeg
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
    const base64Jpeg = dataUrl.split(',')[1];
    
    sendScreenFrame(base64Jpeg);
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !isConnected) return;
    
    sendTextMessage(chatInput);
    setChatInput('');
  };

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join/${channel.id}`;
    navigator.clipboard.writeText(inviteLink);
    setShowInviteCopied(true);
    setTimeout(() => setShowInviteCopied(false), 2000);
  };

  const requestHumanDevRel = () => {
    // Pings a signaling server / DevRel queue in production
    sendTextMessage('I need a human DevRel to join this call.');
    setHasHumanDevRel(true);
    // Simulate a DevRel joining after a few seconds
    setTimeout(() => {
      setParticipants(prev => [...prev, { id: 'devrel-1', name: 'Jesse (Base DevRel)', role: 'devrel' }]);
    }, 3000);
  };

  const endCallWithHistory = async () => {
    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - callStartTime.current.getTime()) / 1000);

    if (transcript.length > 0) {
      // Persist locally as fallback
      const savedCalls = JSON.parse(localStorage.getItem('devrelive_calls') || '[]');
      const localEntry = {
        id: Date.now().toString(),
        channelName: channel.name,
        date: callStartTime.current.toISOString(),
        duration: durationSeconds,
        hasHumanDevRel,
        transcript,
      };
      savedCalls.push(localEntry);
      localStorage.setItem('devrelive_calls', JSON.stringify(savedCalls));

      // Persist to MongoDB with full metadata
      try {
        await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelName: channel.name,
            topic: channel.context ?? channel.name,
            hostAddress: address ?? 'anonymous',
            hostUserId: userId ?? undefined,
            participants: participants.map(p => ({
              address: p.id.startsWith('0x') ? p.id : undefined,
              role: p.role,
            })),
            startTime: callStartTime.current.toISOString(),
            endTime: endTime.toISOString(),
            duration: durationSeconds,
            hasHumanDevRel,
            transcript: transcript.map(t => ({
              role: t.role,
              text: t.text,
              timestamp: new Date(),
            })),
          }),
        });
      } catch (err) {
        console.error('Failed to save call to DB:', err);
      }
    }
    onEndCall();
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 h-full relative">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            {channel.icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{channel.name}</h2>
            <div className="text-sm text-zinc-400 flex items-center gap-2">
              <span className="font-mono">{channel.number}</span>
              <span>•</span>
              {isConnecting ? (
                <span className="text-yellow-500 animate-pulse">Connecting to DevRel AI...</span>
              ) : isConnected ? (
                <span className="text-emerald-500">Connected</span>
              ) : error ? (
                <span className="text-red-500">Connection Failed</span>
              ) : (
                <span className="text-zinc-500">Disconnected</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Top-right Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white rounded-lg transition-colors border border-white/5"
            >
              <LinkIcon className="w-4 h-4" />
              Invite Team
            </button>
            {showInviteCopied && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap z-50">
                Link copied!
              </div>
            )}
          </div>
          <button
            onClick={requestHumanDevRel}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-sm font-medium text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Request Human DevRel
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Screen Share Area */}
        <div className="flex-1 bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden relative flex items-center justify-center">
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${!isScreenSharing ? 'hidden' : ''}`}
          />
          {!isScreenSharing && (
            <div className="text-center text-zinc-500 flex flex-col items-center">
              <MonitorUp className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium text-zinc-400">Screen Share Paused</p>
              <p className="text-sm mt-2">Share your screen to get debugging help</p>
            </div>
          )}
          
          {/* AI Avatar Overlay */}
          <div className="absolute top-6 right-6 w-48 h-64 bg-zinc-950 rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 flex items-center justify-center bg-indigo-500/10 relative">
              {isConnected && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl m-8"
                />
              )}
              <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg relative z-10">
                <span className="text-3xl font-bold">AI</span>
              </div>
            </div>
            <div className="p-3 bg-zinc-900 border-t border-white/10 text-center">
              <div className="text-sm font-medium text-white">DevRel Assistant</div>
              <div className="text-xs text-zinc-500">Base AI Support</div>
            </div>
          </div>

          {/* Grid of other participants */}
          {participants.filter(p => p.id !== '1').length > 0 && (
            <div className="absolute left-6 top-6 flex flex-col gap-4">
              {participants.filter(p => p.id !== '1').map((p) => (
                <div key={p.id} className="w-48 h-32 bg-zinc-950 rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                  <div className="flex-1 flex items-center justify-center bg-zinc-800">
                    <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-white font-medium">
                      {p.name.charAt(0)}
                    </div>
                  </div>
                  <div className="p-2 bg-zinc-900 border-t border-white/10 text-center truncate">
                    <div className="text-xs font-medium text-white truncate px-2">{p.name}</div>
                    <div className="text-[10px] text-zinc-500 capitalize">{p.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transcript Sidebar */}
        <div className="w-80 bg-zinc-900 rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-zinc-900/50">
            <h3 className="font-medium text-white">Live Transcript</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length === 0 ? (
              <div className="text-center text-zinc-500 text-sm mt-10">
                Waiting for conversation to start...
              </div>
            ) : (
              transcript.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'ai' ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 text-sm ${
                    msg.role === 'ai' 
                      ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30' 
                      : 'bg-zinc-800 text-zinc-300 border border-white/10'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="p-4 border-t border-white/10 bg-zinc-900/50">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a link or message..."
                disabled={!isConnected}
                className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isConnected || !chatInput.trim()}
                className="w-9 h-9 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-white/10 bg-zinc-900/50 flex items-center justify-center gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        
        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            !isVideoOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          {!isVideoOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isScreenSharing ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <MonitorUp className="w-6 h-6" />}
        </button>

        <div className="w-px h-8 bg-white/10 mx-2" />

        {isHost ? (
          <button
            onClick={endCallWithHistory}
            className="px-8 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium flex items-center gap-2 transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            End Call
          </button>
        ) : (
          <button
            onClick={onEndCall}
            className="px-8 h-14 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex items-center gap-2 transition-colors border border-white/10"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            Leave Call
          </button>
        )}
      </div>
    </div>
  );
}
