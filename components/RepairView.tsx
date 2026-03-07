import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wrench, Github, Globe, CheckCircle2, CircleDashed, ArrowRight,
  FileCode2, Terminal, Activity, Play, ExternalLink, FileText,
  AlertTriangle, XCircle, RefreshCw, LogOut, GitBranch,
  GitCommit, Clock, History, Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentGate } from './PaymentGate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreamStep {
  step: number;
  title: string;
  status: 'active' | 'done' | 'error' | 'complete';
  detail?: string;
}

interface RepairIssue {
  file: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
}

interface CommitResult {
  file: string;
  success: boolean;
  description: string;
  error?: string;
}

interface RepairReport {
  repoName: string;
  branch: string;
  issuesFound: number;
  issuesFixed: number;
  issues: RepairIssue[];
  fixes: CommitResult[];
  summary: string;
  commitUrl: string;
  repoUrl: string;
}

interface GitHubUser {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

interface RepairHistoryRecord {
  _id: string;
  repoOwner: string;
  repoName: string;
  appUrl: string;
  repoUrl: string;
  branch: string;
  issuesFound: number;
  issuesFixed: number;
  status: 'success' | 'partial' | 'error';
  summary: string;
  commitUrl: string;
  durationMs: number;
  createdAt: string;
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const map = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-zinc-700 text-zinc-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wide ${map[severity]}`}>
      {severity}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RepairView() {
  const { address } = useAuth();
  const [appUrl, setAppUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isRepairing, setIsRepairing] = useState(false);
  const [streamSteps, setStreamSteps] = useState<StreamStep[]>([]);
  const [report, setReport] = useState<RepairReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<GitHubUser>({ connected: false });
  const [checkingGitHub, setCheckingGitHub] = useState(true);
  const [repairHistory, setRepairHistory] = useState<RepairHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  // ── Check GitHub connection status on mount ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justConnected = params.get('github_connected') === '1';
    const ghUser = params.get('github_user');
    const ghError = params.get('github_error');

    if (justConnected) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (ghUser) {
        setGithubUser({ connected: true, username: ghUser });
        setCheckingGitHub(false);
        return;
      }
    }

    if (ghError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setErrorMsg(`GitHub OAuth error: ${ghError.replace(/_/g, ' ')}`);
      setCheckingGitHub(false);
      return;
    }

    fetch('/api/auth/github/status')
      .then((r) => r.json())
      .then((data: GitHubUser) => setGithubUser(data))
      .catch(() => setGithubUser({ connected: false }))
      .finally(() => setCheckingGitHub(false));
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const r = await fetch('/api/repair/history');
      if (r.ok) {
        const data = await r.json();
        setRepairHistory(data.records ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (githubUser.connected) fetchHistory();
  }, [githubUser.connected, fetchHistory]);

  const handleDeleteHistory = async (id: string) => {
    await fetch(`/api/repair/history?id=${id}`, { method: 'DELETE' });
    setRepairHistory((prev) => prev.filter((r) => r._id !== id));
  };

  const handleConnectGitHub = () => {
    window.location.href = '/api/auth/github';
  };

  const handleDisconnect = async () => {
    await fetch('/api/auth/github/status', { method: 'DELETE' });
    setGithubUser({ connected: false });
  };

  const handleStartRepair = useCallback(async () => {
    if (!appUrl.trim() || !repoUrl.trim()) return;
    setIsRepairing(true);
    setStreamSteps([]);
    setReport(null);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/repair/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appUrl: appUrl.trim(), repoUrl: repoUrl.trim() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? 'Failed to start repair');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.status === 'error') {
              setErrorMsg(data.detail ?? 'An unknown error occurred.');
              setIsRepairing(false);
              return;
            }

            if (data.status === 'complete') {
              setReport(data.report as RepairReport);
              setStreamSteps((prev) =>
                prev.map((s) => (s.status === 'active' ? { ...s, status: 'done' } : s))
              );
              setIsRepairing(false);
              fetchHistory();
              return;
            }

            setStreamSteps((prev) => {
              const existing = prev.find((s) => s.step === data.step);
              if (existing) return prev.map((s) => (s.step === data.step ? { ...s, ...data } : s));
              return [...prev, data as StreamStep];
            });
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Connection failed. Please try again.');
      setIsRepairing(false);
    }
  }, [appUrl, repoUrl, fetchHistory]);

  const isRepairFinished = !!report;
  const canStartRepair = githubUser.connected && appUrl.trim() && repoUrl.trim() && !isRepairing;

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-zinc-950 text-white overflow-hidden">
      <PaymentGate
        open={showPaymentGate}
        amount="2.00"
        title="AI Repair Session"
        description="One AI-powered code repair scan &amp; fix"
        purpose="repair"
        userAddress={address}
        onSuccess={() => { setShowPaymentGate(false); handleStartRepair(); }}
        onClose={() => setShowPaymentGate(false)}
      />

      {/* ── Left Panel ──────────────────────────────────────────────────── */}
      <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">

        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Code Repair Agent</h1>
              <p className="text-zinc-400 text-sm">Claude Sonnet 4.6 · Auto-commits to your GitHub repo</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 space-y-6">

          {/* ── GitHub Connection Card ──────────────────────────────────── */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Step 1 — Connect GitHub
            </h2>

            {checkingGitHub ? (
              <div className="flex items-center gap-3 text-zinc-400">
                <CircleDashed className="w-5 h-5 animate-spin" />
                <span className="text-sm">Checking connection…</span>
              </div>
            ) : githubUser.connected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {githubUser.username ? `@${githubUser.username}` : 'GitHub Connected'}
                    </p>
                    <p className="text-xs text-zinc-500">repo scope — read &amp; write</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Authorize DevRelive to read your repo and push fixes directly to{' '}
                  <code className="bg-black/30 px-1 py-0.5 rounded text-indigo-300">main</code>.
                  No installation required — one click OAuth.
                </p>
                <button
                  onClick={handleConnectGitHub}
                  className="flex items-center gap-2 bg-white text-black font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  Connect GitHub
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Input Form ─────────────────────────────────────────────── */}
          <div ref={formTopRef} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Step 2 — Enter URLs
            </h2>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Deployed App URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://your-mini-app.vercel.app"
                  disabled={isRepairing}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">GitHub Repository URL</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  disabled={isRepairing}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {errorMsg}
              </div>
            )}

            <button
              onClick={
                isRepairFinished
                  ? () => { setReport(null); setStreamSteps([]); setErrorMsg(null); }
                  : () => setShowPaymentGate(true)
              }
              disabled={!canStartRepair && !isRepairFinished}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isRepairing ? (
                <>
                  <CircleDashed className="w-5 h-5 animate-spin" />
                  Repair in Progress…
                </>
              ) : isRepairFinished ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Run Another Repair
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {githubUser.connected ? 'Start Repair' : 'Connect GitHub First'}
                </>
              )}
            </button>
          </div>

          {/* ── Live Step Progress ──────────────────────────────────────── */}
          {streamSteps.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Agent Activity</h3>
              <div className="space-y-2">
                {streamSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${
                      step.status === 'active'
                        ? 'bg-indigo-500/10 border-indigo-500/30'
                        : step.status === 'error'
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-zinc-900/50 border-emerald-500/10'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {step.status === 'done' || step.status === 'complete' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : step.status === 'error' ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <CircleDashed className="w-5 h-5 text-indigo-400 animate-spin" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium text-sm ${
                        step.status === 'active' ? 'text-indigo-300'
                        : step.status === 'error' ? 'text-red-300'
                        : 'text-emerald-300'
                      }`}>
                        {step.title}
                      </p>
                      {step.detail && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{step.detail}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Repair Summary ──────────────────────────────────────────── */}
          {report && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-emerald-400" />
                <h3 className="font-semibold text-emerald-300">Repair Complete</h3>
              </div>
              <p className="text-sm text-emerald-200/80 leading-relaxed">{report.summary}</p>
              <ul className="space-y-2">
                {report.fixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {fix.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <span className={fix.success ? 'text-emerald-200/70' : 'text-amber-200/70'}>
                      {fix.description}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href={report.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium py-2 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <GitCommit className="w-4 h-4" />
                View Commits on GitHub
                <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Right Panel — Dashboard ──────────────────────────────────────── */}
      <div className="w-full md:w-1/2 flex flex-col bg-zinc-950 overflow-y-auto">
        <div className="p-4 sm:p-8 border-b border-white/10 flex justify-between items-center bg-zinc-900/30">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Repair Dashboard
          </h2>
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open Repo
            </a>
          )}
        </div>

        <div className="p-4 sm:p-8 space-y-6">

          {/* Report summary */}
          {report ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{report.repoName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-sm text-zinc-400">{report.branch}</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider">
                  {report.issuesFixed === report.issuesFound ? 'All Fixed' : 'Partial Fix'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Issues Found</p>
                  <p className="text-2xl font-bold text-white">{report.issuesFound}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Committed</p>
                  <p className="text-2xl font-bold text-emerald-400">{report.issuesFixed}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400">{report.summary}</p>
            </motion.div>
          ) : (
            <div className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8 text-center">
              <FileCode2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No repair run yet</p>
              <p className="text-xs text-zinc-600 mt-1">Connect GitHub, enter your URLs, and click Start Repair</p>
            </div>
          )}

          {/* Issues list */}
          {report && report.issues.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Issues Identified by Claude
              </h3>
              <div className="space-y-2">
                {report.issues.map((issue, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
                    <div className="flex items-start gap-3 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500 font-mono truncate">{issue.file}</p>
                        <p className="text-sm text-zinc-300 mt-0.5">{issue.issue}</p>
                      </div>
                    </div>
                    <SeverityBadge severity={issue.severity} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dev Tools */}
          <div className="bg-zinc-900/30 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-zinc-900/50 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Dev Tools</h3>
            </div>
            <div className="p-4 flex flex-wrap gap-3">
              <button
                onClick={() => window.open(repoUrl ? repoUrl.replace('github.com', 'vscode.dev/github') : 'https://vscode.dev', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium rounded-xl transition-colors"
              >
                <FileCode2 className="w-4 h-4" />
                Open in VS Code
              </button>
              {report && (
                <a
                  href={report.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
                >
                  <Github className="w-4 h-4" />
                  View Commits
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {appUrl && (
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Preview App
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Repair history / How it works */}
          {!report && (
            <div className="space-y-3">
              {githubUser.connected ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Repair History
                    </h3>
                    <button
                      onClick={fetchHistory}
                      disabled={loadingHistory}
                      className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8 text-zinc-600">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    </div>
                  ) : repairHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <History className="w-8 h-8 text-zinc-700 mb-3" />
                      <p className="text-sm text-zinc-500">No repairs yet</p>
                      <p className="text-xs text-zinc-600 mt-1">Run your first repair above to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {repairHistory.map((rec) => (
                        <div key={rec._id} className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-white font-mono truncate">{rec.repoOwner}/{rec.repoName}</span>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  rec.status === 'success' ? 'bg-green-500/20 text-green-400'
                                  : rec.status === 'partial' ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-red-500/20 text-red-400'
                                }`}>{rec.status}</span>
                              </div>
                              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{rec.summary}</p>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="text-xs text-zinc-600 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {rec.issuesFound} found
                                </span>
                                <span className="text-xs text-zinc-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  {rec.issuesFixed} fixed
                                </span>
                                <span className="text-xs text-zinc-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {Math.round(rec.durationMs / 1000)}s
                                </span>
                                <span className="text-xs text-zinc-600">
                                  {new Date(rec.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-1 shrink-0">
                              {rec.commitUrl && (
                                <a
                                  href={rec.commitUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                                  title="View commits"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {rec.commitUrl && (
                                <a
                                  href={`${rec.commitUrl}/files`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                  title="View diff"
                                >
                                  <GitBranch className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setAppUrl(rec.appUrl || '');
                                  setRepoUrl(rec.repoUrl || '');
                                  setReport(null);
                                  setStreamSteps([]);
                                  setErrorMsg(null);
                                  formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Re-run repair"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteHistory(rec._id)}
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">How It Works</h3>
                  {[
                    { icon: Github, label: 'Connect GitHub via OAuth', desc: 'One click, no installation required' },
                    { icon: Globe, label: 'Enter app + repo URLs', desc: 'Your live deployed app and source repo' },
                    { icon: Activity, label: 'Claude Sonnet 4.6 analyses issues', desc: 'Checks manifest, CORS, frames, APIs' },
                    { icon: GitCommit, label: 'Fixes committed to main', desc: 'Direct commits to your GitHub repo' },
                  ].map(({ icon: Icon, label, desc }, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900/30 border border-white/5 rounded-xl">
                      <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="text-xs text-zinc-500">{desc}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

