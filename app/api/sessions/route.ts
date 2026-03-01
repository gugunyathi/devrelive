import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WalletSession from '@/models/WalletSession';

// POST /api/sessions — create a new wallet session on sign-in
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, address } = body;

    if (!userId || !address) {
      return NextResponse.json({ error: 'userId and address are required' }, { status: 400 });
    }

    // Mark any previously active sessions for this address as ended
    await WalletSession.updateMany(
      { address: address.toLowerCase(), isActive: true },
      {
        $set: {
          isActive: false,
          signedOutAt: new Date(),
        },
      }
    );

    // Create new session
    const session = await WalletSession.create({
      userId,
      address: address.toLowerCase(),
      userAgent: req.headers.get('user-agent') ?? undefined,
      // IP is not directly available in Next.js Edge/Node without req forwarding headers
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/sessions]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
