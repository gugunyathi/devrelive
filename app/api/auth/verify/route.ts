import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import dbConnect from '@/lib/mongodb';
import Nonce from '@/models/Nonce';

const client = createPublicClient({ chain: base, transport: http() });

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { address, message, signature } = await req.json();

    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract nonce from the SIWE message
    const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/i);
    const nonce = nonceMatch?.[1];

    if (!nonce) {
      return NextResponse.json({ error: 'Could not extract nonce from message' }, { status: 400 });
    }

    // Consume nonce atomically — findOneAndDelete ensures one-time use
    const found = await Nonce.findOneAndDelete({ nonce });
    if (!found) {
      return NextResponse.json({ error: 'Nonce not found or already used' }, { status: 400 });
    }

    // Verify signature via viem (handles ERC-6492 undeployed smart wallets automatically)
    const valid = await client.verifyMessage({ address, message, signature });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, address });
  } catch (err) {
    console.error('Auth verify error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
