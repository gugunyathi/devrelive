import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CostRecord from '@/models/CostRecord';

// Seed cost data — derived from DiscordView / AdminView mock data
const SEED_COSTS = [
  { costId: 'cost_1', postId: '1', title: 'App data displayed incorrectly in "Pinned apps"', timeToResolve: '45 hours', callDurationMins: 50, status: 'open', source: 'discord' },
  { costId: 'cost_2', postId: '2', title: 'is the "mini app" concept still supported by base app?', timeToResolve: '9 hours', callDurationMins: 16, status: 'resolved', source: 'discord' },
  { costId: 'cost_3', postId: '3', title: 'base.dev - something went wrong', timeToResolve: '39 hours', callDurationMins: 26, status: 'open', source: 'discord' },
  { costId: 'cost_4', postId: '4', title: 'PathDB geth snapshot?', timeToResolve: '12 hours', callDurationMins: 21, status: 'resolved', source: 'discord' },
  { costId: 'cost_5', postId: '5', title: 'Can\'t sign into base.dev with my wallet', timeToResolve: '48 hours', callDurationMins: 41, status: 'open', source: 'discord' },
  { costId: 'cost_6', postId: '6', title: 'Link to game won\'t open - verification error', timeToResolve: '42 hours', callDurationMins: 46, status: 'open', source: 'discord' },
  { costId: 'cost_7', postId: '7', title: 'How to Get OBN Token Listed As An AppCoin', timeToResolve: '33 hours', callDurationMins: 16, status: 'open', source: 'discord' },
  { costId: 'cost_8', postId: '8', title: 'Proof of ownership doesn\'t work', timeToResolve: '39 hours', callDurationMins: 40, status: 'open', source: 'discord' },
  { costId: 'cost_tg1', postId: 'tg1', title: 'Smart contract deployment failing with out of gas', timeToResolve: '30 hours', callDurationMins: 11, status: 'open', source: 'telegram' },
  { costId: 'cost_tg2', postId: 'tg2', title: 'How to verify contract on Basescan?', timeToResolve: '12 hours', callDurationMins: 21, status: 'resolved', source: 'telegram' },
];

// POST /api/costs/seed — populate the database with initial cost records
export async function POST() {
  try {
    await dbConnect();

    const existingCount = await CostRecord.countDocuments();
    if (existingCount >= SEED_COSTS.length) {
      return NextResponse.json({
        ok: true,
        message: `Already seeded (${existingCount} cost records exist)`,
        seeded: false,
      }, { status: 200 });
    }

    await CostRecord.deleteMany({});

    const UNIT_COST = 2.50;
    const BASE_COST = 10.00;
    const now = Date.now();

    const docs = SEED_COSTS.map((c, i) => ({
      ...c,
      unitCostPerMinute: UNIT_COST,
      baseTicketCost: BASE_COST,
      totalCost: BASE_COST + (c.callDurationMins * UNIT_COST),
      createdAt: new Date(now - (SEED_COSTS.length - i) * 3600000),
      updatedAt: new Date(now - (SEED_COSTS.length - i) * 3600000),
    }));

    await CostRecord.insertMany(docs);

    return NextResponse.json({
      ok: true,
      message: `Seeded ${docs.length} cost records`,
      seeded: true,
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/costs/seed]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
