import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('github_token')?.value;

  if (!token) {
    return NextResponse.json({ connected: false });
  }

  // Validate token is still alive
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'DevRelive-Repair-Agent',
      },
    });
    if (!res.ok) {
      return NextResponse.json({ connected: false });
    }
    const user = await res.json();
    return NextResponse.json({ connected: true, username: user.login, avatarUrl: user.avatar_url });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('github_token');
  response.cookies.delete('github_user');
  return response;
}
