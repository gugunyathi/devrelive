import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CostRecord from '@/models/CostRecord';

// GET /api/costs/stats — aggregated cost analytics
export async function GET() {
  try {
    await dbConnect();

    const [
      totalRecords,
      openRecords,
      resolvedRecords,
    ] = await Promise.all([
      CostRecord.countDocuments(),
      CostRecord.countDocuments({ status: 'open' }),
      CostRecord.countDocuments({ status: 'resolved' }),
    ]);

    // Aggregate total cost and average call duration
    const aggregation = await CostRecord.aggregate([
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          avgCallDuration: { $avg: '$callDurationMins' },
          totalCallMinutes: { $sum: '$callDurationMins' },
          avgCostPerTicket: { $avg: '$totalCost' },
        },
      },
    ]);

    // Cost by source
    const costBySource = await CostRecord.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          avgDuration: { $avg: '$callDurationMins' },
        },
      },
      { $sort: { totalCost: -1 } },
    ]);

    // Cost by status
    const costByStatus = await CostRecord.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
        },
      },
    ]);

    // Today's costs
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayAgg = await CostRecord.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 },
        },
      },
    ]);

    const agg = aggregation[0] || { totalCost: 0, avgCallDuration: 0, totalCallMinutes: 0, avgCostPerTicket: 0 };
    const today = todayAgg[0] || { totalCost: 0, count: 0 };

    return NextResponse.json(
      {
        stats: {
          totalRecords,
          openRecords,
          resolvedRecords,
          totalCost: Math.round(agg.totalCost * 100) / 100,
          avgCallDuration: Math.round(agg.avgCallDuration * 10) / 10,
          totalCallMinutes: Math.round(agg.totalCallMinutes),
          avgCostPerTicket: Math.round(agg.avgCostPerTicket * 100) / 100,
          todayCost: Math.round(today.totalCost * 100) / 100,
          todayTickets: today.count,
        },
        costBySource: costBySource.map((s) => ({
          source: s._id,
          count: s.count,
          totalCost: Math.round(s.totalCost * 100) / 100,
          avgDuration: Math.round(s.avgDuration * 10) / 10,
        })),
        costByStatus: costByStatus.map((s) => ({
          status: s._id,
          count: s.count,
          totalCost: Math.round(s.totalCost * 100) / 100,
        })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[GET /api/costs/stats]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
