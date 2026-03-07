import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Integration from '@/models/Integration';

// GET /api/integrations?address=... — get user's integration connections
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: 'address query param is required' }, { status: 400 });
    }

    const integrations = await Integration.find({ userAddress: address }).lean();

    // Convert to a simple connected map and meta map
    const connected: Record<string, boolean> = {};
    const meta: Record<string, Record<string, unknown>> = {};
    for (const i of integrations) {
      connected[i.integrationId] = i.connected;
      if (i.meta && Object.keys(i.meta).length) meta[i.integrationId] = i.meta as Record<string, unknown>;
    }

    return NextResponse.json({ integrations, connected, meta }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/integrations]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/integrations — connect or disconnect an integration
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { address, integrationId, connected } = body;

    if (!address || !integrationId) {
      return NextResponse.json({ error: 'address and integrationId are required' }, { status: 400 });
    }

    const userAddress = address.toLowerCase();
    const isConnecting = connected !== false; // default to connecting
    const meta = body.meta ?? {};

    // Upsert the integration record
    const integration = await Integration.findOneAndUpdate(
      { userAddress, integrationId },
      {
        $set: {
          connected: isConnecting,
          ...(isConnecting
            ? { connectedAt: new Date(), disconnectedAt: null, ...(Object.keys(meta).length ? { meta } : {}) }
            : { disconnectedAt: new Date(), meta: {} }
          ),
        },
        $setOnInsert: {
          userAddress,
          integrationId,
        },
      },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ integration }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/integrations]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
