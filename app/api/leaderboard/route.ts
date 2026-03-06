import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DevRelStats from '@/models/DevRelStats';

// ─── Seed data so the leaderboard is populated out-of-the-box ──────────────
const SEED_HUMANS = [
  {
    devrelId: 'human_alex_base',
    displayName: 'Alex Base',
    avatarUrl: '',
    description: 'Senior DevRel @ Base. Specialises in Account Abstraction.',
    type: 'human',
    issuesResolved: 142,
    commentsEngaged: 389,
    liveCalls: 78,
    githubPushes: 55,
  },
  {
    devrelId: 'human_sarah_builds',
    displayName: 'Sarah Builds',
    avatarUrl: '',
    description: 'Smart-contract wizard. Loves helping with Paymaster configs.',
    type: 'human',
    issuesResolved: 118,
    commentsEngaged: 310,
    liveCalls: 65,
    githubPushes: 42,
  },
  {
    devrelId: 'human_dev_mike',
    displayName: 'DevMike.eth',
    avatarUrl: '',
    description: 'Full-stack builder & community moderator.',
    type: 'human',
    issuesResolved: 97,
    commentsEngaged: 245,
    liveCalls: 54,
    githubPushes: 38,
  },
  {
    devrelId: 'human_crypto_nina',
    displayName: 'CryptoNina',
    avatarUrl: '',
    description: 'Node infrastructure & RPC troubleshooting expert.',
    type: 'human',
    issuesResolved: 84,
    commentsEngaged: 198,
    liveCalls: 41,
    githubPushes: 29,
  },
  {
    devrelId: 'human_web3_josh',
    displayName: 'Web3Josh',
    avatarUrl: '',
    description: 'Mini-app builder and Base ecosystem contributor.',
    type: 'human',
    issuesResolved: 73,
    commentsEngaged: 172,
    liveCalls: 36,
    githubPushes: 24,
  },
];

const SEED_AGENTS = [
  {
    devrelId: 'agent_devrel_gemini',
    displayName: 'Gemini DevRel',
    avatarUrl: '',
    description: 'Multimodal AI agent powered by Gemini Live — real-time code repair & voice debug.',
    type: 'agent',
    agentFramework: 'Gemini Live',
    agentCapabilities: ['code-repair', 'voice-debug', 'screen-share-analysis'],
    issuesResolved: 1240,
    commentsEngaged: 3560,
    liveCalls: 890,
    githubPushes: 420,
  },
  {
    devrelId: 'agent_base_copilot',
    displayName: 'Base Copilot',
    avatarUrl: '',
    description: 'Specialised in Base L2 smart contracts, Paymaster & Viem integrations.',
    type: 'agent',
    agentFramework: 'GPT-4o',
    agentCapabilities: ['smart-contract-audit', 'paymaster-debug', 'viem-help'],
    issuesResolved: 980,
    commentsEngaged: 2890,
    liveCalls: 710,
    githubPushes: 330,
  },
  {
    devrelId: 'agent_repair_bot',
    displayName: 'RepairBot Alpha',
    avatarUrl: '',
    description: 'Automated repo scanner — finds bugs and opens PRs 24/7.',
    type: 'agent',
    agentFramework: 'Claude 3.5 Sonnet',
    agentCapabilities: ['repo-scan', 'auto-pr', 'ci-debug'],
    issuesResolved: 860,
    commentsEngaged: 1980,
    liveCalls: 540,
    githubPushes: 680,
  },
  {
    devrelId: 'agent_node_guardian',
    displayName: 'Node Guardian',
    avatarUrl: '',
    description: 'Monitors Base nodes, detects sync issues, and guides operators.',
    type: 'agent',
    agentFramework: 'LangGraph',
    agentCapabilities: ['node-monitoring', 'rpc-triage', 'snapshot-guidance'],
    issuesResolved: 730,
    commentsEngaged: 1720,
    liveCalls: 390,
    githubPushes: 210,
  },
  {
    devrelId: 'agent_forum_sage',
    displayName: 'Forum Sage',
    avatarUrl: '',
    description: 'Deep-dives into forum threads and crafts thorough written answers.',
    type: 'agent',
    agentFramework: 'Gemini 1.5 Flash',
    agentCapabilities: ['forum-response', 'docs-search', 'thread-summary'],
    issuesResolved: 610,
    commentsEngaged: 4120,
    liveCalls: 180,
    githubPushes: 90,
  },
];

function score(d: { issuesResolved: number; commentsEngaged: number; liveCalls: number; githubPushes: number }) {
  return d.issuesResolved * 10 + d.commentsEngaged * 2 + d.liveCalls * 5 + d.githubPushes * 8;
}

async function seedIfEmpty() {
  const count = await DevRelStats.countDocuments();
  if (count > 0) return;

  const all = [...SEED_HUMANS, ...SEED_AGENTS].map((d) => ({
    ...d,
    overallScore: score(d),
    devrelTokensEarned: Math.floor(score(d) * 0.5),
    isActive: true,
  }));

  await DevRelStats.insertMany(all);
}

// GET /api/leaderboard?type=human|agent&limit=20
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    await seedIfEmpty();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'human' | 'agent' | null (both)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

    const query: Record<string, unknown> = { isActive: true };
    if (type === 'human' || type === 'agent') query.type = type;

    const entries = await DevRelStats.find(query)
      .sort({ overallScore: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: entries });
  } catch (err) {
    console.error('[leaderboard GET]', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leaderboard  — upsert a devrel's stats (internal / admin use)
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { devrelId, ...updates } = body;

    if (!devrelId) {
      return NextResponse.json({ success: false, error: 'devrelId is required' }, { status: 400 });
    }

    // Recalculate derived fields
    const doc = await DevRelStats.findOne({ devrelId });
    const merged = { ...(doc?.toObject() ?? {}), ...updates };
    merged.overallScore = score(merged);
    merged.devrelTokensEarned = Math.floor(merged.overallScore * 0.5);

    const result = await DevRelStats.findOneAndUpdate(
      { devrelId },
      { $set: { ...updates, overallScore: merged.overallScore, devrelTokensEarned: merged.devrelTokensEarned } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[leaderboard POST]', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
