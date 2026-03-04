import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl(req: NextRequest): string {
  // Prefer the stored cookie origin (set by the /api/auth/github route)
  const cookieOrigin = req.cookies.get('github_oauth_origin')?.value;
  if (cookieOrigin) return cookieOrigin;
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes('MY_APP_URL')) return envUrl.replace(/\/$/, '');
  const { protocol, host } = new URL(req.url);
  return `${protocol}//${host}`;
}

export async function GET(req: NextRequest) {
  const appUrl = getBaseUrl(req);
  const { searchParams } = new URL(req.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = req.cookies.get('github_oauth_state')?.value;

  // CSRF check
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?github_error=state_mismatch&tab=repair`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?github_error=no_code&tab=repair`);
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl}/api/auth/github/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error || !tokenData.access_token) {
    console.error('GitHub OAuth token error:', tokenData);
    return NextResponse.redirect(
      `${appUrl}/?github_error=${encodeURIComponent(tokenData.error_description ?? 'token_exchange_failed')}&tab=repair`
    );
  }

  const accessToken: string = tokenData.access_token;

  // Fetch GitHub username to confirm auth
  let username = '';
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'DevRelive-Repair-Agent' },
    });
    const user = await userRes.json();
    username = user.login ?? '';
  } catch {
    // non-fatal
  }

  const response = NextResponse.redirect(
    `${appUrl}/?tab=repair&github_connected=1&github_user=${encodeURIComponent(username)}`
  );

  // Clear state + origin cookies
  response.cookies.delete('github_oauth_state');
  response.cookies.delete('github_oauth_origin');

  // Store access token in httpOnly cookie (30-day expiry)
  response.cookies.set('github_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  // Store username in readable cookie for UI
  response.cookies.set('github_user', username, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return response;
}
