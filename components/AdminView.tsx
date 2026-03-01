import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Users, PhoneCall, AlertCircle, CheckCircle2, ArrowRightLeft, FileText, Search, Filter, MoreVertical, Clock, ShieldAlert, Lock, User, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CallRecord {
  id: string;
  user: string;
  duration: string;
  status: 'resolved' | 'escalated' | 'open';
  topic: string;
  date: string;
}

interface AdminStats {
  users: { total: number; newToday: number };
  calls: { total: number; today: number; totalDuration: number; avgDuration: number };
  issues: { total: number; open: number; resolved: number; resolutionRate: number };
  activeSessions: number;
}

interface IssueRecord {
  _id: string;
  issueId: string;
  title: string;
  reportedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  createdAt: string;
}

const MOCK_CALLS: CallRecord[] = [
  { id: 'CAL-001', user: '0xAlex', duration: '14:23', status: 'resolved', topic: 'Smart Contract Deployment', date: '2 mins ago' },
  { id: 'CAL-002', user: 'SarahDev', duration: '45:10', status: 'escalated', topic: 'Account Abstraction Gas Issue', date: '1 hour ago' },
  { id: 'CAL-003', user: 'BuildMaster', duration: '08:45', status: 'resolved', topic: 'Viem Integration', date: '3 hours ago' },
  { id: 'CAL-004', user: 'CryptoNinja', duration: '22:15', status: 'open', topic: 'Paymaster Configuration', date: '5 hours ago' },
  { id: 'CAL-005', user: 'Web3Wizard', duration: '12:30', status: 'resolved', topic: 'Base Node Sync', date: '1 day ago' },
];

const MOCK_ISSUES: IssueRecord[] = [
  { _id: '1', issueId: 'ISS-102', title: 'Paymaster Configuration Error', reportedBy: '0xCryptoNinja', priority: 'high', status: 'open', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { _id: '2', issueId: 'ISS-103', title: 'Smart Contract Verification Failing', reportedBy: '0xDevAlice', priority: 'medium', status: 'open', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: '3', issueId: 'ISS-104', title: 'RPC Node Rate Limits', reportedBy: '0xNodeRunner', priority: 'low', status: 'open', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function AdminView() {
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'issues' | 'escalations' | 'reports'>('overview');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [liveCalls, setLiveCalls] = useState<CallRecord[] | null>(null);
  const [liveIssues, setLiveIssues] = useState<IssueRecord[] | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const { address, signIn } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!address) return;
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setAdminStats(await res.json());
    } catch { /* keep null — UI uses placeholders */ }
    finally { setStatsLoading(false); }
  }, [address]);

  const fetchCalls = useCallback(async () => {
    if (!address) return;
    setCallsLoading(true);
    try {
      const res = await fetch('/api/calls?limit=20');
      if (res.ok) {
        const data = await res.json();
        const mapped: CallRecord[] = (data.calls ?? []).map((c: any) => ({
          id: c.callId ?? c._id,
          user: c.hostAddress ? `${c.hostAddress.slice(0, 6)}...${c.hostAddress.slice(-4)}` : 'Unknown',
          duration: formatDuration(c.duration ?? 0),
          status: c.issueResolved ? 'resolved' : c.hasHumanDevRel ? 'escalated' : 'open',
          topic: c.channelName ?? 'DevRel Session',
          date: c.startTime ? timeAgo(c.startTime) : '—',
        }));
        setLiveCalls(mapped.length ? mapped : null);
      }
    } catch { setLiveCalls(null); }
    finally { setCallsLoading(false); }
  }, [address]);

  const fetchIssues = useCallback(async () => {
    if (!address) return;
    setIssuesLoading(true);
    try {
      const res = await fetch('/api/issues?status=open&limit=20');
      if (res.ok) {
        const data = await res.json();
        setLiveIssues((data.issues ?? []).length ? data.issues : null);
      }
    } catch { setLiveIssues(null); }
    finally { setIssuesLoading(false); }
  }, [address]);

  useEffect(() => {
    fetchStats();
    fetchCalls();
    fetchIssues();
  }, [fetchStats, fetchCalls, fetchIssues]);

  const displayCalls = liveCalls ?? MOCK_CALLS;
  const displayIssues = liveIssues ?? MOCK_ISSUES;

  if (!address) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-950 text-white p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/5 mb-6">
          <Lock className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Admin Access Restricted</h2>
        <p className="text-zinc-400 text-center max-w-md mb-8">
          You must be signed in with an authorized Base account to view the admin dashboard.
        </p>
        <button 
          onClick={signIn}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <User className="w-5 h-5" />
          Sign In with Base
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex-none px-8 py-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage calls, issues, and human escalations</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search records..." 
              className="bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors w-64"
            />
          </div>
          <button className="p-2 bg-zinc-900 border border-white/10 rounded-lg hover:bg-zinc-800 transition-colors">
            <Filter className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-none px-8 py-4 border-b border-white/5 flex gap-6">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'calls', label: 'Call History', icon: PhoneCall },
          { id: 'issues', label: 'Open Issues', icon: AlertCircle },
          { id: 'escalations', label: 'Escalations', icon: ArrowRightLeft },
          { id: 'reports', label: 'Reports', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-indigo-500/10 text-indigo-400' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Stats Grid */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-500">{adminStats ? 'Live data' : 'Showing placeholder data'}</span>
              <button onClick={() => { fetchStats(); fetchCalls(); fetchIssues(); }} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                    {adminStats ? `+${adminStats.calls.today} today` : '+12%'}
                  </span>
                </div>
                <h3 className="text-zinc-400 text-sm font-medium">Total Calls</h3>
                <p className="text-3xl font-bold mt-1">{adminStats ? adminStats.calls.total.toLocaleString() : '1,284'}</p>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                    {adminStats ? `${adminStats.activeSessions} Active` : '42 Active'}
                  </span>
                </div>
                <h3 className="text-zinc-400 text-sm font-medium">Open Issues</h3>
                <p className="text-3xl font-bold mt-1">{adminStats ? adminStats.issues.open.toLocaleString() : '156'}</p>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-rose-400 bg-rose-400/10 px-2 py-1 rounded-full">
                    {adminStats ? `${adminStats.users.newToday} new today` : 'High'}
                  </span>
                </div>
                <h3 className="text-zinc-400 text-sm font-medium">Total Users</h3>
                <p className="text-3xl font-bold mt-1">{adminStats ? adminStats.users.total.toLocaleString() : '89'}</p>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                    {adminStats ? `${adminStats.issues.resolutionRate}%` : '94%'}
                  </span>
                </div>
                <h3 className="text-zinc-400 text-sm font-medium">Resolution Rate</h3>
                <p className="text-3xl font-bold mt-1">{adminStats ? adminStats.issues.resolved.toLocaleString() : '1,195'}</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Call Activity</h2>
              <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/50 text-zinc-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Call ID</th>
                      <th className="px-6 py-4 font-medium">User</th>
                      <th className="px-6 py-4 font-medium">Topic</th>
                      <th className="px-6 py-4 font-medium">Duration</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Time</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {callsLoading ? (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">Loading calls...</td></tr>
                    ) : displayCalls.slice(0, 5).map((call) => (
                      <tr key={call.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-zinc-300">{call.id}</td>
                        <td className="px-6 py-4 font-medium">{call.user}</td>
                        <td className="px-6 py-4 text-zinc-400">{call.topic}</td>
                        <td className="px-6 py-4 text-zinc-400 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {call.duration}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            call.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                            call.status === 'escalated' ? 'bg-rose-500/10 text-rose-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {call.status === 'resolved' && <CheckCircle2 className="w-3 h-3" />}
                            {call.status === 'escalated' && <ShieldAlert className="w-3 h-3" />}
                            {call.status === 'open' && <AlertCircle className="w-3 h-3" />}
                            {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500">{call.date}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-1 hover:bg-white/10 rounded text-zinc-400 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Calls Tab */}
        {activeTab === 'calls' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">All Call History</h2>
              <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors">
                Export CSV
              </button>
            </div>
            <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/50 text-zinc-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Call ID</th>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Topic</th>
                    <th className="px-6 py-4 font-medium">Duration</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Time</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {callsLoading ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">Loading calls...</td></tr>
                  ) : displayCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono text-zinc-300">{call.id}</td>
                      <td className="px-6 py-4 font-medium">{call.user}</td>
                      <td className="px-6 py-4 text-zinc-400">{call.topic}</td>
                      <td className="px-6 py-4 text-zinc-400 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {call.duration}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          call.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                          call.status === 'escalated' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {call.status === 'resolved' && <CheckCircle2 className="w-3 h-3" />}
                          {call.status === 'escalated' && <ShieldAlert className="w-3 h-3" />}
                          {call.status === 'open' && <AlertCircle className="w-3 h-3" />}
                          {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{call.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 hover:bg-white/10 rounded text-zinc-400 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Open Issues</h2>
              <button onClick={fetchIssues} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <RefreshCw className={`w-3 h-3 ${issuesLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            {issuesLoading ? (
              <div className="text-center text-zinc-500 py-12">Loading issues...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayIssues.map((issue) => (
                  <div key={issue._id} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-zinc-500">{issue.issueId}</span>
                        </div>
                        <h3 className="font-medium text-lg">{issue.title}</h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          Reported by {issue.reportedBy ? `${issue.reportedBy.slice(0, 6)}...${issue.reportedBy.slice(-4)}` : 'Unknown'} • {timeAgo(issue.createdAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        issue.priority === 'critical' || issue.priority === 'high' ? 'bg-rose-500/20 text-rose-400' :
                        issue.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors">
                        View Details
                      </button>
                      <button className="px-3 py-1.5 bg-white/5 text-zinc-300 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
                        Assign to DevRel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Escalations Tab */}
        {activeTab === 'escalations' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Human Escalations</h2>
            </div>
            <div className="space-y-4">
              {[
                { id: 'ESC-001', user: 'SarahDev', topic: 'Account Abstraction Gas Issue', reason: 'AI unable to resolve complex gas estimation failure', status: 'Pending Review', assignedTo: 'Unassigned' },
                { id: 'ESC-002', user: 'Web3Wizard', topic: 'Base Node Sync', reason: 'User requested human assistance directly', status: 'In Progress', assignedTo: 'Alex (DevRel)' },
              ].map((esc) => (
                <div key={esc.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs text-zinc-500">{esc.id}</span>
                      <h3 className="font-medium">{esc.topic}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-medium">Escalated</span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-1"><span className="text-zinc-300">User:</span> {esc.user}</p>
                    <p className="text-sm text-zinc-400"><span className="text-zinc-300">Reason:</span> {esc.reason}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-sm text-zinc-400">
                      Assigned to: <span className="text-zinc-200">{esc.assignedTo}</span>
                    </div>
                    <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors">
                      Join Call
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Analytics & Reports</h2>
              <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors">
                Generate New Report
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Weekly Call Volume', desc: 'Summary of all calls received over the last 7 days.', icon: PhoneCall },
                { title: 'Resolution Metrics', desc: 'AI vs Human resolution rates and average handling times.', icon: CheckCircle2 },
                { title: 'Top Issues', desc: 'Most common topics and problems reported by developers.', icon: AlertCircle },
                { title: 'User Satisfaction', desc: 'Post-call survey results and feedback scores.', icon: Users },
              ].map((report, idx) => (
                <div key={idx} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors mb-4">
                    <report.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">{report.title}</h3>
                  <p className="text-sm text-zinc-400">{report.desc}</p>
                  <div className="mt-4 text-indigo-400 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Report <ArrowRightLeft className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
