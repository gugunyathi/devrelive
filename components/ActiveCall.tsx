import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { PhoneOff, MonitorUp, MonitorOff, Mic, MicOff, Video, VideoOff, Send, Link, Users, LogOut, Clock } from 'lucide-react';
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
  isJoinedViaLink?: boolean;
  maxDurationSecs?: number;  // undefined = unlimited
}

export function ActiveCall({ channel, onEndCall, isJoinedViaLink, maxDurationSecs }: ActiveCallProps) {
  const { address, userId } = useAuth();
  const { isConnected, isConnecting, error, transcript, connect, disconnect, sendScreenFrame, sendTextMessage } = useGeminiLive(channel.name, channel.context);
  
  useRingbackTone(isConnecting);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // ── Hoisted state/refs needed by endCallAndSave ──────────────
  const callStartTime = useRef<Date>(new Date());
  const [participants, setParticipants] = useState([
    { id: 'ai', name: 'DevRel Assistant', role: 'AI', avatar: 'AI' }
  ]);
  const [isRequestingHuman, setIsRequestingHuman] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const hasHumanDevRel = participants.some(p => p.role === 'Human');

  // ── Countdown timer ──────────────────────────────────────────
  const [secsLeft, setSecsLeft] = useState<number | null>(maxDurationSecs ?? null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const endCallAndSave = useCallback(async (expired = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - callStartTime.current.getTime()) / 1000);

    if (!isJoinedViaLink && transcript.length > 0) {
      const savedCalls = JSON.parse(localStorage.getItem('devrelive_calls') || '[]');
      savedCalls.push({
        id: Date.now().toString(),
        channelName: channel.name,
        date: callStartTime.current.toISOString(),
        duration: durationSeconds,
        hasHumanDevRel,
        transcript,
        expired,
      });
      localStorage.setItem('devrelive_calls', JSON.stringify(savedCalls));

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
              role: p.role === 'AI' ? 'devrel' : p.role === 'Human' ? 'devrel' : p.role === 'Team' ? 'guest' : 'host',
            })),
            startTime: callStartTime.current.toISOString(),
            endTime: endTime.toISOString(),
            duration: durationSeconds,
            hasHumanDevRel,
            transcript: transcript.map(t => ({ role: t.role, text: t.text, timestamp: new Date() })),
          }),
        });
      } catch (err) {
        console.error('Failed to save call to DB:', err);
      }
    }
    onEndCall();
  }, [address, userId, channel, transcript, hasHumanDevRel, isJoinedViaLink, onEndCall]);

  useEffect(() => {
    if (!maxDurationSecs) return;
    setSecsLeft(maxDurationSecs);
    timerRef.current = setInterval(() => {
      setSecsLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Will auto-end in a moment
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDurationSecs]);

  // When countdown hits zero, save & end
  useEffect(() => {
    if (secsLeft === 0) {
      endCallAndSave(true);
    }
  }, [secsLeft, endCallAndSave]);

  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const requestHumanDevRel = () => {
    setIsRequestingHuman(true);
    sendTextMessage('I need a human DevRel to join this call.');
    setTimeout(() => {
      setParticipants(prev => [...prev, { id: 'human-1', name: 'Alex (DevRel)', role: 'Human', avatar: 'A' }]);
      setIsRequestingHuman(false);
    }, 3000);
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href + '?call=' + channel.id);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    
    // Simulate a team member joining after sharing link
    setTimeout(() => {
      setParticipants(prev => {
        if (prev.find(p => p.id === 'team-1')) return prev;
        return [...prev, { id: 'team-1', name: 'Jamie (Frontend)', role: 'Team', avatar: 'J' }];
      });
    }, 5000);
  };

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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (isVideoOn) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('Failed to get local video:', err);
          setIsVideoOn(false);
        });
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [isVideoOn]);

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
      // Small timeout ensures DOM layout is fully updated before scrolling
      setTimeout(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [transcript]);

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 h-full relative">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900/50">
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

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Countdown badge */}
          {secsLeft !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-medium ${
              secsLeft <= 30 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-zinc-800 text-zinc-300 border border-white/8'
            }`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, '0')}
            </div>
          )}
          <button
            onClick={shareLink}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Link className="w-4 h-4" />
            {copiedLink ? 'Copied!' : 'Share Link'}
          </button>
          <button
            onClick={requestHumanDevRel}
            disabled={isRequestingHuman || participants.some(p => p.role === 'Human')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Users className="w-4 h-4" />
            {isRequestingHuman ? 'Requesting...' : 'Request Human'}
          </button>
        </div>
      </div>

      {/* ⏱ Countdown warning banner */}
      {secsLeft !== null && secsLeft <= 30 && secsLeft > 0 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-300 text-sm font-medium">
            {secsLeft}s remaining — call will end automatically
          </span>
        </div>
      )}

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
          
          {/* Participants Overlay */}
          <div className="absolute top-6 right-6 flex flex-col gap-4 max-h-[calc(100%-3rem)] overflow-y-auto custom-scrollbar pr-2">
            {/* Local Participant */}
            <div className="w-40 h-28 sm:w-48 sm:h-32 bg-zinc-950 rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col shrink-0 relative">
              {isVideoOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white shadow-lg">
                    <span className="text-lg sm:text-xl font-bold">Me</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 p-1.5 sm:p-2 bg-zinc-950/90 backdrop-blur-sm border-t border-white/10 text-center z-10">
                <div className="text-xs font-medium text-white truncate">You</div>
                <div className="text-[10px] text-zinc-500">Local</div>
              </div>
            </div>

            {participants.map(p => (
              <div key={p.id} className="w-40 h-28 sm:w-48 sm:h-32 bg-zinc-950 rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col shrink-0">
                <div className="flex-1 flex items-center justify-center bg-zinc-900 relative">
                  {p.id === 'ai' && isConnected && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl m-6"
                    />
                  )}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-lg relative z-10 ${p.role === 'AI' ? 'bg-indigo-500' : p.role === 'Human' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                    <span className="text-lg sm:text-xl font-bold">{p.avatar}</span>
                  </div>
                </div>
                <div className="p-1.5 sm:p-2 bg-zinc-950 border-t border-white/10 text-center">
                  <div className="text-xs font-medium text-white truncate">{p.name}</div>
                  <div className="text-[10px] text-zinc-500">{p.role === 'AI' ? 'Base Support' : p.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript Sidebar */}
        <div className="w-full lg:w-80 bg-zinc-900 rounded-2xl border border-white/10 flex flex-col overflow-hidden shrink-0 h-64 lg:h-auto">
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
      <div className="p-4 sm:p-6 border-t border-white/10 bg-zinc-900/50 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        
        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            !isVideoOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          {!isVideoOn ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${
            isScreenSharing ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <MonitorUp className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>

        <div className="w-px h-8 bg-white/10 mx-1 sm:mx-2 hidden sm:block" />

        <button
          onClick={() => {
            // Just leave the call without saving transcript or ending for others
            onEndCall();
          }}
          className="px-4 sm:px-6 h-12 sm:h-14 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex items-center gap-2 transition-colors text-sm sm:text-base"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          Leave
        </button>

        {!isJoinedViaLink && (
          <button
            onClick={() => endCallAndSave(false)}
            className="px-4 sm:px-6 h-12 sm:h-14 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium flex items-center gap-2 transition-colors text-sm sm:text-base"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">End Call for All</span>
            <span className="sm:hidden">End</span>
          </button>
        )}
      </div>
    </div>
  );
}
