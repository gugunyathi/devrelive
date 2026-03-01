import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

type Params = { params: Promise<{ address: string }> };

// GET /api/users/[address] — full user profile
export async function GET(_req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { address } = await params;

    const user = await User.findOne({ address: address.toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/users/[address]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/users/[address] — update profile fields
export async function PUT(req: Request, { params }: Params) {
  try {
    await dbConnect();
    const { address } = await params;
    const body = await req.json();

    // Only allow safe fields to be updated from the client
    const allowed = ['username', 'bio', 'avatarUrl', 'email', 'preferences'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    update.lastSeenAt = new Date();

    const user = await User.findOneAndUpdate(
      { address: address.toLowerCase() },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error('[PUT /api/users/[address]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
