import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RepairHistory from '@/models/RepairHistory';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const githubUser = cookieStore.get('github_user')?.value;

  if (!githubUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await dbConnect();

  const records = await RepairHistory.find({ githubUsername: githubUser })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({ records });
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const githubUser = cookieStore.get('github_user')?.value;

  if (!githubUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await dbConnect();
  await RepairHistory.deleteOne({ _id: id, githubUsername: githubUser });

  return NextResponse.json({ ok: true });
}
