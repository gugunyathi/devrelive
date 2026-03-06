import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BuilderStats from '@/models/BuilderStats';

const SEED_BUILDERS = [
  { userId: 'builder_0xdevhero',  displayName: '0xDevHero',    issuesRaised: 38, repairsResolved: 31, ratingsGiven: 29, satisfactionRating: 4.9 },
  { userId: 'builder_basebob',    displayName: 'BaseBob.eth',  issuesRaised: 45, repairsResolved: 28, ratingsGiven: 34, satisfactionRating: 4.7 },
  { userId: 'builder_mintmarie',  displayName: 'MintMarie',    issuesRaised: 22, repairsResolved: 19, ratingsGiven: 18, satisfactionRating: 4.8 },
  { userId: 'builder_nodejack',   displayName: 'NodeJack',     issuesRaised: 51, repairsResolved: 38, ratingsGiven: 41, satisfactionRating: 4.5 },
  { userId: 'builder_solidira',   displayName: 'Solidira',     issuesRaised: 17, repairsResolved: 14, ratingsGiven: 13, satisfactionRating: 5.0 },
  { userId: 'builder_gasmaster',  displayName: 'GasMaster',    issuesRaised: 63, repairsResolved: 44, ratingsGiven: 52, satisfactionRating: 4.3 },
  { userId: 'builder_aabigail',   displayName: 'AABigail',     issuesRaised: 29, repairsResolved: 22, ratingsGiven: 25, satisfactionRating: 4.6 },
  { userId: 'builder_rpcraul',    displayName: 'RPCRaul',      issuesRaised: 34, repairsResolved: 27, ratingsGiven: 30, satisfactionRating: 4.4 },
  { userId: 'builder_viemvince',  displayName: 'ViemVince',    issuesRaised: 12, repairsResolved: 10, ratingsGiven: 9,  satisfactionRating: 4.8 },
  { userId: 'builder_paymaxpete', displayName: 'PaymaxPete',   issuesRaised: 26, repairsResolved: 20, ratingsGiven: 22, satisfactionRating: 4.2 },
];

function score(d: { issuesRaised: number; repairsResolved: number; ratingsGiven: number; satisfactionRating: number }) {
  return (
    d.issuesRaised * 3 +
    d.repairsResolved * 15 +
    d.ratingsGiven * 2 +
    Math.floor(d.satisfactionRating * 20)
  );
}

async function seedIfEmpty() {
  const count = await BuilderStats.countDocuments();
  if (count > 0) return;

  const docs = SEED_BUILDERS.map((b) => ({
    ...b,
    avatarUrl: '',
    builderScore: score(b),
    builderRewardsEarned: Math.floor(score(b) * 0.3),
    isActive: true,
  }));

  await BuilderStats.insertMany(docs);
}

// GET /api/leaderboard/community?limit=20
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    await seedIfEmpty();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

    const entries = await BuilderStats.find({ isActive: true })
      .sort({ builderScore: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: entries });
  } catch (err) {
    console.error('[community leaderboard GET]', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leaderboard/community — upsert a builder's stats
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const existing = await BuilderStats.findOne({ userId });
    const merged = { ...(existing?.toObject() ?? {}), ...updates };
    merged.builderScore = score(merged);
    merged.builderRewardsEarned = Math.floor(merged.builderScore * 0.3);

    const result = await BuilderStats.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...updates,
          builderScore: merged.builderScore,
          builderRewardsEarned: merged.builderRewardsEarned,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[community leaderboard POST]', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
