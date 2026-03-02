import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, PhoneCall, AlertCircle, CheckCircle2, ArrowRightLeft, FileText, Search, Filter, MoreVertical, Clock, ShieldAlert, Lock, User, DollarSign, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CallRecord {
  id: string;
  user: string;
  duration: string;
  status: 'resolved' | 'escalated' | 'open';
  topic: string;
  date: string;
}

const MOCK_CALLS: CallRecord[] = [
  { id: 'CAL-001', user: '0xAlex', duration: '14:23', status: 'resolved', topic: 'Smart Contract Deployment', date: '2 mins ago' },
  { id: 'CAL-002', user: 'SarahDev', duration: '45:10', status: 'escalated', topic: 'Account Abstraction Gas Issue', date: '1 hour ago' },
  { id: 'CAL-003', user: 'BuildMaster', duration: '08:45', status: 'resolved', topic: 'Viem Integration', date: '3 hours ago' },
  { id: 'CAL-004', user: 'CryptoNinja', duration: '22:15', status: 'open', topic: 'Paymaster Configuration', date: '5 hours ago' },
  { id: 'CAL-005', user: 'Web3Wizard', duration: '12:30', status: 'resolved', topic: 'Base Node Sync', date: '1 day ago' },
];

const INITIAL_POSTS = [
  { id: '1', channelId: 'developer-forum', title: 'App data displayed incorrectly in "Pinned apps"', content: 'I\'m launching my mini app "Squadletics" on Base app but I encountered an issue that I can\'t figure out how to solve. I think maybe there\'s some kind of a bug on the Base app side, or maybe I\'m doing something wrong. So Squadletics now can be found among "Apps" in the search. In search results, it displays the correct icon, name and tagline. And when I click it, it opens etc. But then when I pin it to "My apps", in "My apps" list it displays no icon, name is incorrect and it leads to the wrong URL (leads to <squadletics dot com> when it\'s clearly set in the manifest that homeUrl is <squadletics dot com /baseapp> Do you know why it might be happening? On Farcaster it\'s being displayed correctly and leads to the correct URL etc.', author: 'Linas | true.eth', replies: 7, time: '1/23/26, 7:18 PM', tags: ['Mini Apps', 'Bug Report'], hasImage: true, resolved: false },
  { id: '2', channelId: 'developer-forum', title: 'is the "mini app" concept still supported by base app?', content: 'now that farcaster is going away, is the mini app going to be removed from base app?', author: 'vDan', replies: 3, time: '2/19/26, 6:26 AM', tags: ['Mini Apps', 'Question'], hasImage: false, resolved: true },
  { id: '3', channelId: 'developer-forum', title: 'base.dev - something went wrong', content: 'looking for info regarding an error registering apps on base.dev', author: 'kieran', replies: 5, time: '2/22/26, 7:05 PM', tags: ['Bug Report'], hasImage: false, resolved: false },
  { id: '4', channelId: 'developer-forum', title: 'PathDB geth snapshot?', content: 'Hello everyone, I\'d like to know if there\'s a pathdb snapshot for geth available. The one at https://docs.base.org/base-chain/node-operators/snapshots is hashdb', author: 'Lolmode', replies: 4, time: '2/23/26, 7:59 PM', tags: ['Node'], hasImage: false, resolved: true },
  { id: '5', channelId: 'developer-forum', title: 'Can\'t sign into base.dev with my wallet', content: 'After I keyed in my passphrase to log in into base.dev I\'m receiving the following error: {\n"message": "No signers found",\n"stack": "Error: No signers found\\n at wL..."}', author: 'cell', replies: 8, time: '2/27/26, 6:17 AM', tags: ['Base Account', 'Bug Report'], hasImage: false, resolved: false },
  { id: '6', channelId: 'developer-forum', title: 'Why won\'t my link to the game open? I get this error message.Please wait while we verify your identi', content: 'I\'m having trouble with my application on base.dev. When I try to access the link, it throws an error and asks me to verify my identity, but the verification process never completes.\n\nHas anyone else experienced this issue recently? Here are my logs:\n\nError: Verification timeout at 30000ms\nat Object.verifyIdentity (/app/src/auth.ts:42:15)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)', author: 'Ruslan S.', replies: 6, time: '2/25/26, 10:57 PM', tags: ['Mini Apps'], hasImage: true, resolved: false },
  { id: '7', channelId: 'developer-forum', title: 'How to Get OBN Token Listed As An AppCoin is Base App', content: 'Recently, Base App added a new feature where coins can be labeled as AppCoins and the application associated with the coin can be displayed on the coin’s page. I was wondering if you could help get the Olive Branch Network listed as an AppCoin with its app displayed on the coin’s page? I asked about this in my group with the Base NA team and was asked to post the question in this forum.', author: 'jack2163', replies: 3, time: '2/27/26, 9:28 PM', tags: ['Question'], hasImage: false, resolved: false },
  { id: '8', channelId: 'developer-forum', title: 'Proof of ownership doesn\'t work', content: 'Proof of ownership doesn\'t work, although everything seems to be correct', author: 'TokoGaz', replies: 5, time: '2/27/26, 11:06 PM', tags: ['Bug Report'], hasImage: true, resolved: false },
  { id: '9', channelId: 'developer-forum', title: 'Shipped my first dApp on Base — Shitcoin Graveyard (NFT tombstones for dead tokens)', content: 'Hey builders! Just deployed my first project on Base and wanted to share. Shitcoin Graveyard — a dApp where users bury their dead ERC-20 tokens and receive an animated on-chain SVG tombstone NFT. How it works:\n● Connect wallet → auto-scans for your tokens\n● Pick a dead token, write a custom epitaph\n● Token gets locked in the contract forever\n● You receive an animated NFT tombstone (flickering candles, twinkling stars, floating particles)\nTech stack:\n● Solidity (ERC-721 + SafeERC20)\n● Next.js 14 + TypeScript\n● RainbowKit + Wagmi v2\n● Tailwind CSS + Framer Motion', author: 'bezdar`?', replies: 4, time: 'Yesterday at 3:59 PM', tags: ['Discussion'], hasImage: false, resolved: false },
  { id: '10', channelId: 'developer-forum', title: 'base.dev something went wrong message, no matter what I try', content: 'I tried everything I know', author: 'Kurogane (黒鋼)', replies: 7, time: 'Yesterday at 10:10 PM', tags: ['Bug Report'], hasImage: true, resolved: false },
  { id: 'tg1', channelId: 'developer-forum', title: 'Smart contract deployment failing with out of gas', content: 'Hey everyone, I am trying to deploy a new ERC20 contract but it keeps failing with out of gas error. I have increased the gas limit but it still fails. Any ideas?', author: 'CryptoDev_TG', replies: 2, time: 'Today at 9:15 AM', tags: ['Smart Contracts', 'Bug Report'], hasImage: false, resolved: false, source: 'telegram' },
  { id: 'tg2', channelId: 'developer-forum', title: 'How to verify contract on Basescan?', content: 'I deployed my contract but having trouble verifying it on Basescan using Hardhat. The API key seems correct but it says "Failed to verify".', author: 'Web3Builder_TG', replies: 4, time: 'Today at 10:30 AM', tags: ['Tooling', 'Question'], hasImage: false, resolved: true, source: 'telegram' },
];

const GLOBAL_UNIT_COST_PER_MINUTE = 2.50;
const BASE_TICKET_COST = 10.00;

const INITIAL_COST_DATA = INITIAL_POSTS.map(post => {
  // Estimate cost based on interaction: replies, content length, and images
  const estimatedCallMins = (post.replies * 5) + Math.floor(post.content.length / 50) + (post.hasImage ? 15 : 0);
  const estimatedTimeToResolve = `${post.replies * 3 + (post.resolved ? 0 : 24)} hours`;
  
  return {
    id: post.id,
    title: post.title,
    timeToResolve: estimatedTimeToResolve,
    callDurationMins: estimatedCallMins,
    status: post.resolved ? 'resolved' : 'open',
    source: (post as any).source
  };
});

export function AdminView() {
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'issues' | 'escalations' | 'reports' | 'costs'>('overview');
  const [costData, setCostData] = useState(INITIAL_COST_DATA);
  const { address, signIn } = useAuth();

  // Real-time cost calculation for open problems
  useEffect(() => {
    if (activeTab !== 'costs') return;
    
    const interval = setInterval(() => {
      setCostData(prev => prev.map(item => {
        if (item.status === 'open') {
          // Increment call duration by 1 second (1/60th of a minute) to simulate active running costs
          return { ...item, callDurationMins: item.callDurationMins + (1 / 60) };
        }
        return item;
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

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
      <div className="flex-none px-8 py-4 border-b border-white/5 flex gap-6 overflow-x-auto custom-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'calls', label: 'Call History', icon: PhoneCall },
          { id: 'issues', label: 'Open Issues', icon: AlertCircle },
          { id: 'escalations', label: 'Escalations', icon: ArrowRightLeft },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'costs', label: 'Costs', icon: DollarSign },
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">+12%</span>
                </div>
                <h3 className="text-zinc-400 text-sm font-medium">Total Calls (Today)</h3>
                <p className="text-3xl font-bold mt-1">1,284</p>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">42 Active</span>
                </div>
                <h3 className="text-zinc-400 text-sm font-medium">Open Problems</h3>
                <p className="text-3xl font-bold mt-1">156</p>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-rose-400 bg-rose-400/10 px-2 py-1 rounded-full">High</span>
                </div>
                <h3 className="text-zinc-400 text-sm font-medium">Human Escalations</h3>
                <p className="text-3xl font-bold mt-1">89</p>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">94%</span>
                </div>
                <h3 className="text-zinc-400 text-sm font-medium">Resolution Rate</h3>
                <p className="text-3xl font-bold mt-1">1,195</p>
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
                    {MOCK_CALLS.map((call) => (
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
                  {MOCK_CALLS.map((call) => (
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
              <h2 className="text-xl font-semibold">Open Problems</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'ISS-102', title: 'Paymaster Configuration Error', user: 'CryptoNinja', priority: 'High', date: '5 hours ago' },
                { id: 'ISS-103', title: 'Smart Contract Verification Failing', user: 'DevAlice', priority: 'Medium', date: '1 day ago' },
                { id: 'ISS-104', title: 'RPC Node Rate Limits', user: 'NodeRunner', priority: 'Low', date: '2 days ago' },
              ].map((issue) => (
                <div key={issue.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{issue.title}</h3>
                      <p className="text-sm text-zinc-400 mt-1">Reported by {issue.user} • {issue.date}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      issue.priority === 'High' ? 'bg-rose-500/20 text-rose-400' :
                      issue.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {issue.priority}
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

        {/* Costs Tab */}
        {activeTab === 'costs' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Resolution Costs</h2>
                <p className="text-sm text-zinc-400 mt-1">Estimated costs based on a global call center unit cost of ${GLOBAL_UNIT_COST_PER_MINUTE.toFixed(2)}/min + ${BASE_TICKET_COST.toFixed(2)} base ticket cost.</p>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 flex items-center gap-4 shrink-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Total Estimated Cost</p>
                  <p className="text-2xl font-bold text-white">
                    ${costData.reduce((acc, curr) => acc + BASE_TICKET_COST + (curr.callDurationMins * GLOBAL_UNIT_COST_PER_MINUTE), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-zinc-950/50 text-zinc-400 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-medium">Problem / Thread</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Time to Resolve</th>
                      <th className="px-6 py-4 font-medium">Call Time</th>
                      <th className="px-6 py-4 font-medium text-right">Estimated Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {costData.map((item) => {
                      const cost = BASE_TICKET_COST + (item.callDurationMins * GLOBAL_UNIT_COST_PER_MINUTE);
                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-medium text-zinc-200 max-w-md truncate" title={item.title}>
                            <div className="flex items-center gap-2">
                              {item.source === 'telegram' && (
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#229ED9]/10 text-[#229ED9]" title="Telegram">
                                  <MessageCircle className="w-3 h-3" />
                                </span>
                              )}
                              <span className="truncate">{item.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              item.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {item.status === 'resolved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3 animate-pulse" />}
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{item.timeToResolve}</td>
                          <td className="px-6 py-4 text-zinc-400 font-mono">{item.callDurationMins.toFixed(2)} mins</td>
                          <td className="px-6 py-4 text-right font-mono text-emerald-400 font-medium">${cost.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
