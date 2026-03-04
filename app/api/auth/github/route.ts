import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes('MY_APP_URL') && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/$/, '');
  }
  // Derive from request origin — works on any deployment
  const { protocol, host } = new URL(req.url);
  return `${protocol}//${host}`;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId || clientId === 'YOUR_GITHUB_CLIENT_ID') {
    return NextResponse.json(
      { error: 'GITHUB_CLIENT_ID is not configured in environment variables.' },
      { status: 500 }
    );
  }

  const appUrl = getBaseUrl(req);
  const state = crypto.randomUUID();
  const redirectUri = `${appUrl}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo',
    state,
  });

  const response = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );

  // Store state + redirectUri in cookie for CSRF protection (5 min expiry)
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  response.cookies.set('github_oauth_origin', appUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });

  return response;
}
