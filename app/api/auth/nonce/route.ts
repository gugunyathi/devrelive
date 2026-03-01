import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { nonces } from '@/lib/nonce-store';

export async function GET() {
  const nonce = crypto.randomBytes(16).toString('hex');
  nonces.add(nonce);
  return NextResponse.json({ nonce });
}
