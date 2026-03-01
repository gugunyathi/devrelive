import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { nonces } from '@/lib/nonce-store';

const client = createPublicClient({ chain: base, transport: http() });

export async function POST(req: Request) {
  try {
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

    // Confirm nonce was issued by us (not replayed from elsewhere)
    if (!nonces.has(nonce)) {
      return NextResponse.json({ error: 'Nonce not found or already used' }, { status: 400 });
    }

    // Verify signature via viem (handles ERC-6492 undeployed smart wallets automatically)
    const valid = await client.verifyMessage({ address, message, signature });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Consume nonce — one-time use
    nonces.delete(nonce);

    return NextResponse.json({ ok: true, address });
  } catch (err) {
    console.error('Auth verify error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
