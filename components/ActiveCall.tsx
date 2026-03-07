import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { PhoneOff, MonitorUp, MonitorOff, Mic, MicOff, Video, VideoOff, Send, Users, LogOut, Clock, Github, RefreshCw } from 'lucide-react';
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
  const hasHumanDevRel = participants.some(p => p.role === 'Human');

  // ── Code review state ─────────────────────────────────────────
  const [sideTab, setSideTab] = useState<'transcript' | 'code'>('transcript');
  const [ghConnected, setGhConnected] = useState<{ ok: boolean; username?: string } | null>(null);
  const [reviewRepoUrl, setReviewRepoUrl] = useState('');
  const [repoTree, setRepoTree] = useState<{ path: string; size?: number }[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filesLoading, setFilesLoading] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewQuestion, setReviewQuestion] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [codeStatus, setCodeStatus] = useState<string | null>(null);
  const reviewScrollRef = useRef<HTMLDivElement>(null);

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

  // ── Code review helpers ───────────────────────────────────────
  const checkGhStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/github/status');
      const data = await res.json();
      setGhConnected({ ok: data.connected, username: data.username });
    } catch {
      setGhConnected({ ok: false });
    }
  }, []);

  const loadRepoFiles = async () => {
    if (!reviewRepoUrl.trim()) return;
    setFilesLoading(true);
    setRepoTree([]);
    setSelectedFiles(new Set());
    try {
      const res = await fetch(`/api/calls/review?repoUrl=${encodeURIComponent(reviewRepoUrl.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setRepoTree(data.files ?? []);
      } else {
        const err = await res.json().catch(() => ({}));
        setCodeStatus(err.error ?? 'Failed to load files');
      }
    } catch {
      setCodeStatus('Network error loading files');
    } finally {
      setFilesLoading(false);
    }
  };

  const sendCodeToGemini = async () => {
    if (!reviewRepoUrl.trim() || !isConnected) return;
    setCodeStatus('Fetching code…');
    try {
      const res = await fetch('/api/calls/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: reviewRepoUrl.trim(),
          files: selectedFiles.size > 0 ? [...selectedFiles] : undefined,
          mode: 'context',
        }),
      });
      if (res.ok) {
        const { content, fileCount } = await res.json();
        sendTextMessage(
          `[Code Review Request]\nRepository: ${reviewRepoUrl.trim()}\n\n${content}\n\nPlease review this code and help with any questions.`
        );
        setCodeStatus(`✓ ${fileCount} file(s) shared with Gemini — check transcript`);
        setSideTab('transcript');
      } else {
        const err = await res.json().catch(() => ({}));
        setCodeStatus(err.error ?? 'Failed to fetch code');
      }
    } catch {
      setCodeStatus('Network error');
    }
  };

  const runClaudeReview = async () => {
    if (!reviewRepoUrl.trim()) return;
    setIsReviewing(true);
    setReviewText('');
    setCodeStatus(null);
    try {
      const res = await fetch('/api/calls/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: reviewRepoUrl.trim(),
          files: selectedFiles.size > 0 ? [...selectedFiles] : undefined,
          question: reviewQuestion.trim() || undefined,
          mode: 'review',
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setCodeStatus(err.error ?? 'Review failed');
        setIsReviewing(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) setReviewText(prev => {
              const next = prev + data.text;
              setTimeout(() => reviewScrollRef.current?.scrollTo({ top: reviewScrollRef.current.scrollHeight }), 10);
              return next;
            });
            if (data.error) setCodeStatus(data.error);
          } catch { /* ignore malformed */ }
        }
      }
    } catch {
      setCodeStatus('Network error during review');
    } finally {
      setIsReviewing(false);
    }
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

        {/* Transcript / Code Review Sidebar */}
        <div className="w-full lg:w-80 bg-zinc-900 rounded-2xl border border-white/10 flex flex-col overflow-hidden shrink-0 h-64 lg:h-auto">

          {/* Tab bar */}
          <div className="flex border-b border-white/10 shrink-0">
            <button
              onClick={() => setSideTab('transcript')}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                sideTab === 'transcript'
                  ? 'text-white border-b-2 border-indigo-400 bg-transparent'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Transcript
            </button>
            <button
              onClick={() => {
                setSideTab('code');
                if (!ghConnected) checkGhStatus();
              }}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors ${
                sideTab === 'code'
                  ? 'text-white border-b-2 border-indigo-400 bg-transparent'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              Code Review
            </button>
          </div>

          {/* ── Transcript tab ─────────────────────────────────────── */}
          {sideTab === 'transcript' && (
            <>
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
              <div className="p-4 border-t border-white/10 bg-zinc-900/50 shrink-0">
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
            </>
          )}

          {/* ── Code Review tab ────────────────────────────────────── */}
          {sideTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {ghConnected === null ? (
                /* Loading */
                <div className="flex items-center justify-center flex-1 gap-2 text-zinc-500 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Checking GitHub…
                </div>
              ) : !ghConnected.ok ? (
                /* Not connected */
                <div className="p-4 flex flex-col gap-4">
                  <p className="text-sm text-zinc-400">
                    Connect your GitHub account so Gemini and Claude can read your code during this call.
                  </p>
                  <a
                    href="/api/auth/github?redirect=/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors border border-white/10"
                  >
                    <Github className="w-4 h-4" />
                    Connect GitHub (new tab)
                  </a>
                  <button
                    onClick={checkGhStatus}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Already connected? Refresh
                  </button>
                </div>
              ) : (
                /* Connected */
                <div className="flex flex-col flex-1 overflow-hidden">

                  {/* Connected badge */}
                  <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5 shrink-0">
                    <Github className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">@{ghConnected.username}</span>
                  </div>

                  {/* Repo URL input */}
                  <div className="px-3 pt-3 pb-2 flex gap-2 shrink-0">
                    <input
                      type="url"
                      value={reviewRepoUrl}
                      onChange={(e) => { setReviewRepoUrl(e.target.value); setRepoTree([]); setSelectedFiles(new Set()); setCodeStatus(null); }}
                      placeholder="https://github.com/user/repo"
                      className="flex-1 min-w-0 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={loadRepoFiles}
                      disabled={!reviewRepoUrl.trim() || filesLoading}
                      className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-medium rounded-lg transition-colors shrink-0 flex items-center gap-1"
                    >
                      {filesLoading
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : 'Load'}
                    </button>
                  </div>

                  {/* File tree */}
                  {repoTree.length > 0 && (
                    <div className="px-3 pb-2 shrink-0">
                      <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wide">
                        {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select files (or leave empty for auto)'} 
                      </p>
                      <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
                        {repoTree.map(file => (
                          <label key={file.path} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.path)}
                              onChange={(e) => {
                                setSelectedFiles(prev => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(file.path);
                                  else next.delete(file.path);
                                  return next;
                                });
                              }}
                              className="rounded accent-indigo-500 shrink-0"
                            />
                            <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 truncate">{file.path}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question input */}
                  <div className="px-3 pb-2 shrink-0">
                    <input
                      type="text"
                      value={reviewQuestion}
                      onChange={(e) => setReviewQuestion(e.target.value)}
                      placeholder="Optional: specific question for Claude…"
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  {/* Status message */}
                  {codeStatus && (
                    <p className="px-3 pb-2 text-xs text-zinc-400 shrink-0">{codeStatus}</p>
                  )}

                  {/* Action buttons */}
                  <div className="px-3 pb-3 flex flex-col gap-2 shrink-0">
                    <button
                      onClick={sendCodeToGemini}
                      disabled={!reviewRepoUrl.trim() || !isConnected}
                      className="w-full py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-40 text-indigo-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {selectedFiles.size > 0 ? `Share ${selectedFiles.size} file(s) with Gemini` : 'Share repo with Gemini'}
                    </button>
                    <button
                      onClick={runClaudeReview}
                      disabled={!reviewRepoUrl.trim() || isReviewing}
                      className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 text-amber-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {isReviewing
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Reviewing…</>
                        : 'Claude Sonnet Deep Review'}
                    </button>
                  </div>

                  {/* Claude review output */}
                  {reviewText && (
                    <div
                      ref={reviewScrollRef}
                      className="flex-1 overflow-y-auto px-3 pb-3 min-h-0"
                    >
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                        <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-2">Claude Review</p>
                        <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{reviewText}</pre>
                        {isReviewing && <span className="inline-block w-1.5 h-3.5 bg-amber-400 animate-pulse ml-1 align-middle" />}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
