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

    // Convert to a simple connected map
    const connected: Record<string, boolean> = {};
    for (const i of integrations) {
      connected[i.integrationId] = i.connected;
    }

    return NextResponse.json({ integrations, connected }, { status: 200 });
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

    // Upsert the integration record
    const integration = await Integration.findOneAndUpdate(
      { userAddress, integrationId },
      {
        $set: {
          connected: isConnecting,
          ...(isConnecting
            ? { connectedAt: new Date(), disconnectedAt: null }
            : { disconnectedAt: new Date() }
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
