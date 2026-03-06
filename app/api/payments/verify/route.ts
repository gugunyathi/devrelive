/**
 * POST /api/payments/verify
 *
 * Body: { txId, purpose, userAddress }
 *
 * - Verifies the payment completed on-chain via getPaymentStatus()
 * - Checks sender matches the authenticated userAddress
 * - Prevents replay attacks via unique txId in MongoDB
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProcessedPayment from '@/models/ProcessedPayment';
import { verifyPayment, PAYMENT_ADDRESS } from '@/lib/payments';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { txId, purpose, userAddress } = await req.json();

    if (!txId || !purpose || !userAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1 — Replay protection: reject if already processed
    const existing = await ProcessedPayment.findOne({ txId });
    if (existing) {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 409 });
    }

    // 2 — Verify on-chain status
    const { status, sender, amount, recipient } = await verifyPayment(txId);

    if (status !== 'completed') {
      return NextResponse.json({ error: `Payment not completed. Status: ${status}` }, { status: 402 });
    }

    // 3 — Anti-impersonation: sender must match the authenticated user
    if (sender.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Payment sender does not match authenticated user' }, { status: 403 });
    }

    // 4 — Verify recipient is our payment address
    if (PAYMENT_ADDRESS && recipient.toLowerCase() !== PAYMENT_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: 'Payment recipient mismatch' }, { status: 403 });
    }

    // 5 — Persist (unique index prevents double-spend race)
    await ProcessedPayment.create({ txId, sender, recipient, amount, purpose, userAddress });

    return NextResponse.json({ ok: true, txId, amount, purpose });
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    // MongoDB duplicate key — race condition
    if (e?.code === 11000) {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 409 });
    }
    console.error('[POST /api/payments/verify]', err);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}
