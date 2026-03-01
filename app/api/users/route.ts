import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// POST /api/users — upsert user by wallet address; returns userId
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const address = body.address?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    // Find existing or create new — return full document
    let user = await User.findOne({ address });

    if (!user) {
      user = await User.create({ address });
    } else {
      // Bump last-seen
      user.lastSeenAt = new Date();
      await user.save();
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/users]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/users?address=0x... — look up a user by address
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: 'address query param is required' }, { status: 400 });
    }

    const user = await User.findOne({ address });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/users]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
