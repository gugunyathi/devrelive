'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  User,
  Bot,
  CheckCircle2,
  MessageSquare,
  Phone,
  GitCommit,
  Star,
  Coins,
  RefreshCw,
  Medal,
  ChevronUp,
  ChevronDown,
  Minus,
  Info,
  Users,
  Wrench,
  ThumbsUp,
  Award,
  AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DevRelEntry {
  _id: string;
  devrelId: string;
  displayName: string;
  avatarUrl?: string;
  description?: string;
  type: 'human' | 'agent';
  agentFramework?: string;
  agentCapabilities?: string[];
  issuesResolved: number;
  commentsEngaged: number;
  liveCalls: number;
  githubPushes: number;
  overallScore: number;
  devrelTokensEarned: number;
}

type SortKey =
  | 'overallScore'
  | 'issuesResolved'
  | 'commentsEngaged'
  | 'liveCalls'
  | 'githubPushes'
  | 'devrelTokensEarned';

interface CommunityEntry {
  _id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  address?: string;
  issuesRaised: number;
  repairsResolved: number;
  ratingsGiven: number;
  satisfactionRating: number;
  builderScore: number;
  builderRewardsEarned: number;
}

type CommunitySortKey =
  | 'builderScore'
  | 'issuesRaised'
  | 'repairsResolved'
  | 'ratingsGiven'
  | 'satisfactionRating'
  | 'builderRewardsEarned';

// ─── Constants ────────────────────────────────────────────────────────────────
const RANK_COLORS = ['text-yellow-400', 'text-zinc-300', 'text-amber-500'];
const RANK_BG = [
  'bg-yellow-400/8 border-l-2 border-yellow-400/40',
  'bg-zinc-300/5 border-l-2 border-zinc-400/30',
  'bg-amber-500/8 border-l-2 border-amber-500/30',
];

const STAT_COLS: {
  key: SortKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}[] = [
  { key: 'issuesResolved',     label: 'Issues Resolved', shortLabel: 'Issues',   icon: <CheckCircle2 className="w-3.5 h-3.5" />,  color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { key: 'commentsEngaged',    label: 'Comments',         shortLabel: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-blue-400',    bgColor: 'bg-blue-500/10'   },
  { key: 'liveCalls',          label: 'Live Calls',       shortLabel: 'Calls',    icon: <Phone className="w-3.5 h-3.5" />,         color: 'text-purple-400',  bgColor: 'bg-purple-500/10' },
  { key: 'githubPushes',       label: 'GitHub Pushes',    shortLabel: 'Pushes',   icon: <GitCommit className="w-3.5 h-3.5" />,     color: 'text-orange-400',  bgColor: 'bg-orange-500/10' },
  { key: 'overallScore',       label: 'Score',            shortLabel: 'Score',    icon: <Star className="w-3.5 h-3.5" />,           color: 'text-yellow-400',  bgColor: 'bg-yellow-500/10' },
  { key: 'devrelTokensEarned', label: 'DR Tokens',        shortLabel: 'Tokens',   icon: <Coins className="w-3.5 h-3.5" />,          color: 'text-pink-400',    bgColor: 'bg-pink-500/10'   },
];

const COMMUNITY_COLS: {
  key: CommunitySortKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  isFloat?: boolean;
}[] = [
  { key: 'issuesRaised',       label: 'Issues Raised',      shortLabel: 'Issues',   icon: <AlertCircle className="w-3.5 h-3.5" />,  color: 'text-red-400',     bgColor: 'bg-red-500/10'    },
  { key: 'repairsResolved',    label: 'Repairs Resolved',   shortLabel: 'Repairs',  icon: <Wrench className="w-3.5 h-3.5" />,       color: 'text-emerald-400', bgColor: 'bg-emerald-500/10'},
  { key: 'ratingsGiven',       label: 'Ratings Given',      shortLabel: 'Rated',    icon: <ThumbsUp className="w-3.5 h-3.5" />,     color: 'text-blue-400',    bgColor: 'bg-blue-500/10'   },
  { key: 'satisfactionRating', label: 'Satisfaction Score', shortLabel: 'Sat.',     icon: <Star className="w-3.5 h-3.5" />,          color: 'text-yellow-400',  bgColor: 'bg-yellow-500/10', isFloat: true },
  { key: 'builderScore',       label: 'Builder Score',      shortLabel: 'Score',    icon: <Award className="w-3.5 h-3.5" />,        color: 'text-violet-400',  bgColor: 'bg-violet-500/10' },
  { key: 'builderRewardsEarned',label: 'Builder Rewards',   shortLabel: 'Rewards',  icon: <Coins className="w-3.5 h-3.5" />,        color: 'text-pink-400',    bgColor: 'bg-pink-500/10'   },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400/15">
      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
    </span>
  );
  if (rank === 2) return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-400/15">
      <Medal className="w-3.5 h-3.5 text-zinc-300" />
    </span>
  );
  if (rank === 3) return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15">
      <Medal className="w-3.5 h-3.5 text-amber-500" />
    </span>
  );
  return (
    <span className="flex items-center justify-center w-7 text-xs font-mono text-zinc-500">
      {rank}
    </span>
  );
}

function Avatar({
  displayName, avatarUrl, variant = 'human', size = 'md',
}: {
  displayName: string;
  avatarUrl?: string;
  variant?: 'human' | 'agent' | 'builder';
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const icon = size === 'lg' ? 'w-6 h-6' : 'w-3.5 h-3.5';
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={displayName}
        className={`${dim} rounded-full object-cover border border-white/10 shrink-0`} />
    );
  }
  const styles: Record<string, string> = {
    agent:   'bg-indigo-500/20 border-indigo-500/30',
    human:   'bg-emerald-500/20 border-emerald-500/30',
    builder: 'bg-teal-500/20 border-teal-500/30',
  };
  const icons: Record<string, React.ReactNode> = {
    agent:   <Bot className={`${icon} text-indigo-400`} />,
    human:   <User className={`${icon} text-emerald-400`} />,
    builder: <Users className={`${icon} text-teal-400`} />,
  };
  return (
    <div className={`${dim} rounded-full flex items-center justify-center border shrink-0 ${styles[variant]}`}>
      {icons[variant]}
    </div>
  );
}

function PodiumCard({
  displayName, avatarUrl, scoreLabel, badge, rank, variant = 'human',
}: {
  displayName: string;
  avatarUrl?: string;
  scoreLabel: string;
  badge?: string;
  rank: number;
  variant?: 'human' | 'agent' | 'builder';
}) {
  const heights = ['h-28', 'h-20', 'h-16'];
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <Avatar displayName={displayName} avatarUrl={avatarUrl} variant={variant} size="lg" />
      <span className={`text-xs font-semibold text-center truncate w-full px-1 ${RANK_COLORS[rank - 1]}`}>
        {displayName}
      </span>
      {badge && (
        <span className="text-[9px] text-indigo-400/80 font-mono truncate max-w-full px-1">{badge}</span>
      )}
      <span className="text-xs font-mono text-zinc-400">{scoreLabel}</span>
      <div className={`w-full rounded-t-lg mt-auto ${heights[rank - 1]} ${
        rank === 1 ? 'bg-yellow-400/20 border border-yellow-400/20'
        : rank === 2 ? 'bg-zinc-400/10 border border-zinc-400/20'
        : 'bg-amber-500/10 border border-amber-500/20'
      } flex items-center justify-center`}>
        <RankBadge rank={rank} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LeaderboardView() {
  const [tab, setTab] = useState<'human' | 'agent' | 'community'>('human');

  // DevRel state (human / agent)
  const [entries, setEntries] = useState<DevRelEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('overallScore');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Community state
  const [communityEntries, setCommunityEntries] = useState<CommunityEntry[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communitySortKey, setCommunitySortKey] = useState<CommunitySortKey>('builderScore');
  const [communitySortDir, setCommunitySortDir] = useState<'desc' | 'asc'>('desc');

  const [showFormula, setShowFormula] = useState(false);

  const { address } = useAuth();

  const fetchDevRel = useCallback(async (type: 'human' | 'agent') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?type=${type}&limit=20`);
      const json = await res.json();
      if (json.success) setEntries(json.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  const fetchCommunity = useCallback(async () => {
    setCommunityLoading(true);
    try {
      const res = await fetch('/api/leaderboard/community?limit=20');
      const json = await res.json();
      if (json.success) setCommunityEntries(json.data);
    } catch { /* silent */ } finally { setCommunityLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'community') fetchCommunity();
    else fetchDevRel(tab);
  }, [tab, fetchDevRel, fetchCommunity]);

  const sorted = [...entries].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === 'desc' ? -diff : diff;
  });

  const communitySorted = [...communityEntries].sort((a, b) => {
    const diff = a[communitySortKey] - b[communitySortKey];
    return communitySortDir === 'desc' ? -diff : diff;
  });

  const myDevRelRank = address
    ? sorted.findIndex((e) => e.devrelId.toLowerCase() === address.toLowerCase()) + 1
    : 0;
  const myCommunityRank = address
    ? communitySorted.findIndex((e) => e.address?.toLowerCase() === address.toLowerCase()) + 1
    : 0;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleCommunitySort = (key: CommunitySortKey) => {
    if (key === communitySortKey) setCommunitySortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setCommunitySortKey(key); setCommunitySortDir('desc'); }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (colKey !== sortKey) return <Minus className="w-3 h-3 text-zinc-700" />;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-indigo-400" /> : <ChevronUp className="w-3 h-3 text-indigo-400" />;
  };

  const CommunitySortIcon = ({ colKey }: { colKey: CommunitySortKey }) => {
    if (colKey !== communitySortKey) return <Minus className="w-3 h-3 text-zinc-700" />;
    return communitySortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-teal-400" /> : <ChevronUp className="w-3 h-3 text-teal-400" />;
  };

  const top3 = sorted.slice(0, 3);
  const communityTop3 = communitySorted.slice(0, 3);
  const maxScore = sorted[0]?.overallScore || 1;
  const maxBuilderScore = communitySorted[0]?.builderScore || 1;

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950 overflow-hidden">

      {/* ── Page header ── */}
      <div className="shrink-0 px-4 sm:px-6 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">DevRel Leaderboard</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Top performers helping builders on Base</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFormula((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${
                showFormula ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
              title="Scoring formula"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={() => tab === 'community' ? fetchCommunity() : fetchDevRel(tab as 'human' | 'agent')}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || communityLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Formula panel */}
        <AnimatePresence>
          {showFormula && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden max-w-5xl mx-auto"
            >
              {tab !== 'community' ? (
                <div className="mt-3 px-4 py-3 rounded-xl bg-zinc-900 border border-white/5 text-xs font-mono space-y-1">
                  <p className="text-[11px] uppercase tracking-wider font-sans font-semibold text-zinc-400 mb-2">DevRel Scoring</p>
                  <p><span className="text-yellow-400">Score</span> = Issues×<span className="text-emerald-400">10</span> + Pushes×<span className="text-orange-400">8</span> + Calls×<span className="text-purple-400">5</span> + Comments×<span className="text-blue-400">2</span></p>
                  <p><span className="text-pink-400">DR Tokens</span> = Score × <span className="text-zinc-300">0.5</span></p>
                </div>
              ) : (
                <div className="mt-3 px-4 py-3 rounded-xl bg-zinc-900 border border-white/5 text-xs font-mono space-y-1">
                  <p className="text-[11px] uppercase tracking-wider font-sans font-semibold text-zinc-400 mb-2">Builder Scoring</p>
                  <p><span className="text-violet-400">Score</span> = Repairs×<span className="text-emerald-400">15</span> + Issues×<span className="text-red-400">3</span> + Rated×<span className="text-blue-400">2</span> + floor(Sat.×<span className="text-yellow-400">20</span>)</p>
                  <p><span className="text-pink-400">Builder Rewards</span> = Score × <span className="text-zinc-300">0.3</span></p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 mt-4 max-w-5xl mx-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTab('human')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              tab === 'human'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="hidden xs:inline">Human </span>DevRels
          </button>
          <button
            onClick={() => setTab('agent')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              tab === 'agent'
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="hidden xs:inline">Agent </span>DevRels
          </button>
          <button
            onClick={() => setTab('community')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              tab === 'community'
                ? 'bg-teal-500/15 text-teal-400 border border-teal-500/25'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            Community
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 pb-20 md:pb-8">

          {/* ── DevRel tabs (human / agent) ── */}
          {tab !== 'community' && (
            loading ? (
              <div className="flex items-center justify-center py-24">
                <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-600">
                <Trophy className="w-10 h-10" /><p className="text-sm">No entries yet</p>
              </div>
            ) : (
              <>
                {/* Mobile podium */}
                {top3.length === 3 && (
                  <div className="md:hidden mb-6">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 font-medium">Top 3</p>
                    <div className="flex items-end gap-3">
                      {[top3[1], top3[0], top3[2]].map((e, idx) => {
                        const r = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                        return (
                          <PodiumCard key={e.devrelId} displayName={e.displayName} avatarUrl={e.avatarUrl}
                            scoreLabel={`${e.overallScore.toLocaleString()} pts`}
                            badge={e.type === 'agent' ? e.agentFramework : undefined}
                            variant={e.type === 'agent' ? 'agent' : 'human'} rank={r} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-[2.5rem_1fr_repeat(6,_minmax(5rem,_7rem))] items-center gap-x-2 px-4 py-2 mb-1">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">#</span>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">DevRel</span>
                    {STAT_COLS.map((col) => (
                      <button key={col.key} onClick={() => handleSort(col.key)}
                        className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider hover:text-zinc-400 transition-colors group">
                        <span className={`${col.color} opacity-70 group-hover:opacity-100`}>{col.icon}</span>
                        <span className={col.key === sortKey ? 'text-zinc-300' : 'text-zinc-600'}>{col.shortLabel}</span>
                        <SortIcon colKey={col.key} />
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                    {sorted.map((entry, i) => {
                      const rank = i + 1; const isTop3 = rank <= 3;
                      const isYou = !!address && entry.devrelId.toLowerCase() === address.toLowerCase();
                      const scoreBar = (entry.overallScore / maxScore) * 100;
                      return (
                        <motion.div key={entry.devrelId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025, duration: 0.2 }}
                          className={`relative grid grid-cols-[2.5rem_1fr_repeat(6,_minmax(5rem,_7rem))] items-center gap-x-2 px-4 py-3.5 hover:bg-white/[0.025] transition-colors ${isTop3 ? RANK_BG[rank - 1] : ''} ${isYou ? 'ring-1 ring-inset ring-teal-500/40 bg-teal-500/5' : ''}`}>
                          {!isTop3 && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none opacity-60" style={{ width: `${scoreBar}%` }} />}
                          <div className="flex items-center justify-center relative z-10"><RankBadge rank={rank} /></div>
                          <div className="flex items-center gap-3 min-w-0 relative z-10">
                            <Avatar displayName={entry.displayName} avatarUrl={entry.avatarUrl} variant={entry.type} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold truncate ${isTop3 ? RANK_COLORS[rank - 1] : 'text-white'}`}>{entry.displayName}</span>
                                {entry.type === 'agent' && entry.agentFramework && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">{entry.agentFramework}</span>
                                )}
                              </div>
                              {entry.description && <p className="text-xs text-zinc-500 truncate max-w-xs mt-0.5">{entry.description}</p>}
                            </div>
                          </div>
                          {STAT_COLS.map((col) => (
                            <div key={col.key} className="flex items-center justify-end relative z-10">
                              <span className={`text-sm font-mono tabular-nums ${col.key === sortKey ? col.color : 'text-zinc-300'}`}>
                                {(entry[col.key] as number).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      );
                    })}
                  </div>                  {address && myDevRelRank > 0 && (
                    <div className="mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl border border-teal-500/30 bg-teal-500/5 text-sm">
                      <span className="text-teal-400 font-medium">Your rank</span>
                      <span className="font-mono font-semibold text-teal-300">#{myDevRelRank} · {sorted[myDevRelRank - 1]?.overallScore.toLocaleString()} pts</span>
                    </div>
                  )}                </div>

                {/* Mobile list */}
                <div className="md:hidden">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 font-medium">Full Rankings</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
                    {STAT_COLS.map((col) => (
                      <button key={col.key} onClick={() => handleSort(col.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${
                          sortKey === col.key ? `${col.bgColor} ${col.color} border border-current/20` : 'bg-zinc-900 text-zinc-500 border border-white/5'
                        }`}>
                        <span className={sortKey === col.key ? col.color : 'text-zinc-600'}>{col.icon}</span>
                        {col.shortLabel}
                        {sortKey === col.key && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                    {sorted.map((entry, i) => {
                      const rank = i + 1; const isTop3 = rank <= 3;
                      return (
                        <motion.div key={entry.devrelId} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.18 }}
                          className={`px-4 py-3 transition-colors ${isTop3 ? RANK_BG[rank - 1] : 'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center gap-3">
                            <RankBadge rank={rank} />
                            <Avatar displayName={entry.displayName} avatarUrl={entry.avatarUrl} variant={entry.type} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold truncate ${isTop3 ? RANK_COLORS[rank - 1] : 'text-white'}`}>{entry.displayName}</span>
                                {entry.type === 'agent' && entry.agentFramework && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">{entry.agentFramework}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                {STAT_COLS.map((col) => (
                                  <span key={col.key} className={`flex items-center gap-1 text-[10px] font-mono ${col.key === sortKey ? col.color : 'text-zinc-500'}`}>
                                    <span className={col.key === sortKey ? col.color : 'text-zinc-600'}>{col.icon}</span>
                                    {(entry[col.key] as number).toLocaleString()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </>
            )
          )}

          {/* ── Community tab ── */}
          {tab === 'community' && (
            communityLoading ? (
              <div className="flex items-center justify-center py-24">
                <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
              </div>
            ) : communitySorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-600">
                <Users className="w-10 h-10" /><p className="text-sm">No builders yet</p>
              </div>
            ) : (
              <>
                {/* Mobile podium */}
                {communityTop3.length === 3 && (
                  <div className="md:hidden mb-6">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 font-medium">Top 3 Builders</p>
                    <div className="flex items-end gap-3">
                      {[communityTop3[1], communityTop3[0], communityTop3[2]].map((e, idx) => {
                        const r = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                        return (
                          <PodiumCard key={e.userId} displayName={e.displayName} avatarUrl={e.avatarUrl}
                            scoreLabel={`${e.builderScore.toLocaleString()} pts`} variant="builder" rank={r} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-[2.5rem_1fr_repeat(6,_minmax(5rem,_7rem))] items-center gap-x-2 px-4 py-2 mb-1">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">#</span>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Builder</span>
                    {COMMUNITY_COLS.map((col) => (
                      <button key={col.key} onClick={() => handleCommunitySort(col.key)}
                        className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider hover:text-zinc-400 transition-colors group">
                        <span className={`${col.color} opacity-70 group-hover:opacity-100`}>{col.icon}</span>
                        <span className={col.key === communitySortKey ? 'text-zinc-300' : 'text-zinc-600'}>{col.shortLabel}</span>
                        <CommunitySortIcon colKey={col.key} />
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                    {communitySorted.map((entry, i) => {
                      const rank = i + 1; const isTop3 = rank <= 3;
                      const isYou = !!address && entry.address?.toLowerCase() === address.toLowerCase();
                      const scoreBar = (entry.builderScore / maxBuilderScore) * 100;
                      return (
                        <motion.div key={entry.userId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025, duration: 0.2 }}
                          className={`relative grid grid-cols-[2.5rem_1fr_repeat(6,_minmax(5rem,_7rem))] items-center gap-x-2 px-4 py-3.5 hover:bg-white/[0.025] transition-colors ${isTop3 ? RANK_BG[rank - 1] : ''} ${isYou ? 'ring-1 ring-inset ring-teal-500/40 bg-teal-500/5' : ''}`}>
                          {!isTop3 && <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent pointer-events-none opacity-60" style={{ width: `${scoreBar}%` }} />}
                          <div className="flex items-center justify-center relative z-10"><RankBadge rank={rank} /></div>
                          <div className="flex items-center gap-3 min-w-0 relative z-10">
                            <Avatar displayName={entry.displayName} avatarUrl={entry.avatarUrl} variant="builder" />
                            <div className="min-w-0">
                              <span className={`text-sm font-semibold truncate block ${isTop3 ? RANK_COLORS[rank - 1] : 'text-white'}`}>{entry.displayName}</span>
                              {entry.address && <p className="text-xs text-zinc-600 font-mono truncate mt-0.5">{entry.address.slice(0, 6)}…{entry.address.slice(-4)}</p>}
                            </div>
                          </div>
                          {COMMUNITY_COLS.map((col) => (
                            <div key={col.key} className="flex items-center justify-end relative z-10">
                              <span className={`text-sm font-mono tabular-nums ${col.key === communitySortKey ? col.color : 'text-zinc-300'}`}>
                                {col.isFloat ? `★ ${entry[col.key].toFixed(1)}` : (entry[col.key] as number).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      );
                    })}
                  </div>
                  {address && myCommunityRank > 0 && (
                    <div className="mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl border border-teal-500/30 bg-teal-500/5 text-sm">
                      <span className="text-teal-400 font-medium">Your rank</span>
                      <span className="font-mono font-semibold text-teal-300">#{myCommunityRank} · {communitySorted[myCommunityRank - 1]?.builderScore.toLocaleString()} pts</span>
                    </div>
                  )}
                </div>

                {/* Mobile list */}
                <div className="md:hidden">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 font-medium">Full Rankings</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
                    {COMMUNITY_COLS.map((col) => (
                      <button key={col.key} onClick={() => handleCommunitySort(col.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${
                          communitySortKey === col.key ? `${col.bgColor} ${col.color} border border-current/20` : 'bg-zinc-900 text-zinc-500 border border-white/5'
                        }`}>
                        <span className={communitySortKey === col.key ? col.color : 'text-zinc-600'}>{col.icon}</span>
                        {col.shortLabel}
                        {communitySortKey === col.key && (communitySortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                    {communitySorted.map((entry, i) => {
                      const rank = i + 1; const isTop3 = rank <= 3;
                      return (
                        <motion.div key={entry.userId} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.18 }}
                          className={`px-4 py-3 transition-colors ${isTop3 ? RANK_BG[rank - 1] : 'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center gap-3">
                            <RankBadge rank={rank} />
                            <Avatar displayName={entry.displayName} avatarUrl={entry.avatarUrl} variant="builder" size="sm" />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-semibold truncate block ${isTop3 ? RANK_COLORS[rank - 1] : 'text-white'}`}>{entry.displayName}</span>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                {COMMUNITY_COLS.map((col) => (
                                  <span key={col.key} className={`flex items-center gap-1 text-[10px] font-mono ${col.key === communitySortKey ? col.color : 'text-zinc-500'}`}>
                                    <span className={col.key === communitySortKey ? col.color : 'text-zinc-600'}>{col.icon}</span>
                                    {col.isFloat ? `★ ${entry[col.key].toFixed(1)}` : (entry[col.key] as number).toLocaleString()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </>
            )
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-600">
        {tab !== 'community' ? (
          <>
            <span>{sorted.length} {tab === 'human' ? 'human' : 'AI agent'} DevRels</span>
            <span className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-pink-500/50" />Tokens = Score × 0.5</span>
          </>
        ) : (
          <>
            <span>{communitySorted.length} builders ranked</span>
            <span className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-pink-500/50" />Rewards = Score × 0.3</span>
          </>
        )}
      </div>
    </div>
  );
}
