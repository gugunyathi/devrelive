import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CallHistory from '@/models/CallHistory';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();

    const call = await CallHistory.create(data);

    return NextResponse.json({ call }, { status: 201 });
  } catch (error) {
    console.error('Error saving call history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
