import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import connectMongo from '@/lib/mongodb';
import CallHistory from '@/models/CallHistory';

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const GITHUB_API = 'https://api.github.com';

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:[/?#]|$)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

// Files to prioritise when no specific selection is made
const PRIORITY_PATTERNS = [
  /package\.json$/,
  /next\.config/,
  /app\/layout\.(tsx?|jsx?)$/,
  /app\/page\.(tsx?|jsx?)$/,
  /\.well-known\/farcaster\.json$/,
  /farcaster\.json$/,
  /manifest\.json$/,
  /vercel\.json$/,
  /middleware\.(ts|js)$/,
];

const CODE_EXTENSIONS = /\.(ts|tsx|js|jsx|json|css|md|toml|yaml|yml|env\.example)$/;

// ─── GET /api/calls/review?repoUrl=... ────────────────────────────────────────
// Returns the repo file tree so the client can show a file selector.

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const ghToken = cookieStore.get('github_token')?.value;

  if (!ghToken) {
    return Response.json({ error: 'Not authenticated with GitHub' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const repoUrl = searchParams.get('repoUrl');
  if (!repoUrl) return Response.json({ error: 'repoUrl is required' }, { status: 400 });

  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return Response.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });

  const { owner, repo } = parsed;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'DevRelive/1.0',
  };

  try {
    const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: ghHeaders });
    if (!repoRes.ok) {
      return Response.json({ error: `Repo not found or inaccessible (HTTP ${repoRes.status})` }, { status: repoRes.status });
    }
    const repoInfo = await repoRes.json();
    const defaultBranch: string = repoInfo.default_branch ?? 'main';

    const treeRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers: ghHeaders }
    );
    if (!treeRes.ok) {
      return Response.json({ error: 'Failed to fetch repository file tree' }, { status: 500 });
    }
    const { tree, truncated } = await treeRes.json();

    const files = (tree as { path: string; type: string; size: number }[])
      .filter(item => item.type === 'blob')
      .filter(item => CODE_EXTENSIONS.test(item.path))
      .filter(item => !item.path.includes('node_modules') && !item.path.includes('.next') && !item.path.includes('dist/'))
      .sort((a, b) => {
        const aPriority = PRIORITY_PATTERNS.some(p => p.test(a.path)) ? 0 : 1;
        const bPriority = PRIORITY_PATTERNS.some(p => p.test(b.path)) ? 0 : 1;
        return aPriority - bPriority || a.path.localeCompare(b.path);
      })
      .slice(0, 120)
      .map(item => ({ path: item.path, size: item.size }));

    return Response.json({ files, owner, repo, branch: defaultBranch, truncated });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// ─── POST /api/calls/review ───────────────────────────────────────────────────
// mode=context → returns file contents as JSON (for sending to Gemini)
// mode=review  → streams a Claude Sonnet code review as SSE

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const ghToken = cookieStore.get('github_token')?.value;

  if (!ghToken) {
    return Response.json({ error: 'Not authenticated with GitHub' }, { status: 401 });
  }

  const body = await req.json() as {
    repoUrl: string;
    files?: string[];
    question?: string;
    mode: 'context' | 'review';
    callId?: string;
  };

  const { repoUrl, files, question, mode, callId } = body;

  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return Response.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });

  const { owner, repo } = parsed;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'DevRelive/1.0',
  };

  // Get default branch
  const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: ghHeaders });
  if (!repoRes.ok) return Response.json({ error: 'Repo not found' }, { status: 404 });
  const { default_branch: defaultBranch } = await repoRes.json();

  // Determine which files to fetch
  let filesToFetch: string[] = files?.length ? files : [];

  if (filesToFetch.length === 0) {
    // Auto-select priority files
    const treeRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers: ghHeaders }
    );
    if (treeRes.ok) {
      const { tree } = await treeRes.json();
      filesToFetch = (tree as { path: string; type: string }[])
        .filter(item => item.type === 'blob' && PRIORITY_PATTERNS.some(p => p.test(item.path)))
        .map(item => item.path)
        .slice(0, 8);
    }
  }

  // Fetch file contents (cap at 8 files, 6 KB each to stay within token budget)
  const fileContents: { path: string; content: string }[] = [];
  await Promise.allSettled(
    filesToFetch.slice(0, 8).map(async (path) => {
      try {
        const res = await fetch(
          `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${defaultBranch}`,
          { headers: ghHeaders }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.size > 120_000) return; // skip huge files
          const decoded = Buffer.from(data.content ?? '', 'base64').toString('utf-8');
          fileContents.push({ path, content: decoded.slice(0, 6_000) });
        }
      } catch { /* skip */ }
    })
  );

  const codeBlock = fileContents
    .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  // ── Context mode: return JSON for Gemini ─────────────────────────────────
  if (mode === 'context') {
    const summary = fileContents
      .map(f => `[${f.path}]\n${f.content.slice(0, 1_500)}`)
      .join('\n\n---\n\n');
    return Response.json({
      content: `Repository: ${owner}/${repo}\n\n${summary}`,
      fileCount: fileContents.length,
    });
  }

  // ── Review mode: stream Claude Sonnet analysis ────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const claudeStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `You are a senior Base/Web3 engineer doing a live code review during a DevRel support call.

Repository: ${owner}/${repo}

${codeBlock}

${question ? `Developer's question: ${question}\n\n` : ''}
Please provide a focused code review covering:
1. A 1-2 sentence overview of what this code does
2. The most important issues or improvements (prioritise Base/Farcaster/Web3 best practices)
3. Specific actionable fixes with code snippets where helpful

Keep it concise — this is a live call. Use markdown formatting.`,
            },
          ],
        });

        let fullReviewText = '';
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullReviewText += event.delta.text;
            send({ text: event.delta.text });
          }
        }
        send({ done: true });

        // Persist review to CallHistory if a callId was provided
        if (callId && fullReviewText) {
          connectMongo().then(() =>
            CallHistory.updateOne(
              { callId },
              { $push: { codeReviews: { repoUrl, reviewText: fullReviewText, reviewedAt: new Date() } } }
            )
          ).catch(() => {});
        }
      } catch (e) {
        send({ error: String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
