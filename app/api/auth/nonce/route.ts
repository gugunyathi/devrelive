import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import Nonce from '@/models/Nonce';

export async function GET() {
  await dbConnect();
  const nonce = crypto.randomBytes(16).toString('hex');
  await Nonce.create({ nonce });
  return NextResponse.json({ nonce });
}
