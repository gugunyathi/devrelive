import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import dbConnect from '@/lib/mongodb';
import RepairHistory from '@/models/RepairHistory';

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const GITHUB_API = 'https://api.github.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:[/?#]|$)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function send(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Priority 1 — always fetch these if present
const PRIORITY_PATTERNS = [
  /\.well-known\/farcaster\.json$/,
  /(?:^|\/)farcaster\.json$/i,
  /(?:^|\/)manifest\.json$/i,
  /^next\.config\.(ts|js|mjs)$/,
  /^package\.json$/,
  /^vercel\.json$/,
  /^netlify\.toml$/,
  /middleware\.(ts|js)$/,
  /app\/layout\.(tsx?|jsx?)$/,
  /app\/page\.(tsx?|jsx?)$/,
  /app\/globals\.css$/,
];

// Priority 2 — include up to budget after priority files
const SECONDARY_PATTERNS = [
  /app\/api\/.*route\.(ts|js)$/,
  /^public\/.*\.(json|webmanifest)$/i,
  /components\/.*\.(tsx?|jsx?)$/,
  /hooks\/.*\.(ts|js)$/,
  /lib\/.*\.(ts|js)$/,
  /^tsconfig\.json$/,
  /\.env\.example$/,
];

async function ghFetch(url: string, ghHeaders: Record<string, string>) {
  const res = await fetch(url, { headers: ghHeaders });
  if (res.status === 403 || res.status === 429) {
    const resetAt = res.headers.get('x-ratelimit-reset');
    const waitSec = resetAt ? Math.ceil(Number(resetAt) - Date.now() / 1000) : 60;
    throw new Error(`GitHub API rate limit hit. Resets in ${waitSec}s. Please try again shortly.`);
  }
  return res;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const ghToken = cookieStore.get('github_token')?.value;
  const ghUsername = cookieStore.get('github_user')?.value ?? '';

  if (!ghToken) {
    return new Response(JSON.stringify({ error: 'Not authenticated with GitHub. Please connect your GitHub account first.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { appUrl, repoUrl } = body as { appUrl?: string; repoUrl?: string };

  if (!appUrl?.trim() || !repoUrl?.trim()) {
    return new Response(JSON.stringify({ error: 'Both appUrl and repoUrl are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = parseRepoUrl(repoUrl.trim());
  if (!parsed) {
    return new Response(JSON.stringify({ error: 'Invalid GitHub repository URL. Use the format: https://github.com/username/repo' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { owner, repo } = parsed;
  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'DevRelive-Repair-Agent/1.0',
  };

  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Step 0: Verify GitHub access ──────────────────────────────────
        send(controller, { step: 0, title: 'Connecting to GitHub', status: 'active' });

        const repoInfoRes = await ghFetch(`${GITHUB_API}/repos/${owner}/${repo}`, ghHeaders);
        if (!repoInfoRes.ok) {
          const errBody = await repoInfoRes.json().catch(() => ({}));
          throw new Error(
            repoInfoRes.status === 404
              ? `Repository "${owner}/${repo}" not found. Make sure the URL is correct and your GitHub account has access.`
              : `GitHub API error ${repoInfoRes.status}: ${errBody.message ?? 'unknown'}`
          );
        }

        const repoInfo = await repoInfoRes.json();
        const defaultBranch: string = repoInfo.default_branch ?? 'main';
        const isPrivate: boolean = repoInfo.private ?? false;

        send(controller, {
          step: 0,
          title: 'Connected to GitHub',
          status: 'done',
          detail: `${owner}/${repo} · ${defaultBranch} · ${isPrivate ? 'private' : 'public'}`,
        });

        // ── Step 1: Map repository & fetch key files ───────────────────────
        send(controller, { step: 1, title: 'Mapping Repository Files', status: 'active' });

        const treeRes = await ghFetch(
          `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
          ghHeaders
        );
        if (!treeRes.ok) throw new Error('Failed to fetch repository file tree from GitHub.');

        const treeData = await treeRes.json();
        const allBlobs: Array<{ path: string; sha: string }> =
          (treeData.tree ?? []).filter((f: { type: string }) => f.type === 'blob');

        // Score and select files
        const priorityFiles = allBlobs.filter((f) => PRIORITY_PATTERNS.some((p) => p.test(f.path)));
        const secondaryFiles = allBlobs
          .filter((f) => !priorityFiles.includes(f) && SECONDARY_PATTERNS.some((p) => p.test(f.path)))
          .slice(0, 20);

        const filesToFetch = [...priorityFiles, ...secondaryFiles].slice(0, 30);

        const fileContents: Record<string, { content: string; sha: string; size: number }> = {};

        await Promise.allSettled(
          filesToFetch.map(async (f) => {
            try {
              const r = await ghFetch(
                `${GITHUB_API}/repos/${owner}/${repo}/contents/${f.path}?ref=${defaultBranch}`,
                ghHeaders
              );
              if (r.ok) {
                const data = await r.json();
                // Skip files over 100KB
                if (data.size > 100_000) return;
                const decoded = Buffer.from(data.content ?? '', 'base64').toString('utf-8');
                fileContents[f.path] = { content: decoded, sha: data.sha, size: data.size };
              }
            } catch {
              // skip individual failures
            }
          })
        );

        send(controller, {
          step: 1,
          title: 'Repository Files Loaded',
          status: 'done',
          detail: `${Object.keys(fileContents).length} files · ${allBlobs.length} total in repo`,
        });

        // ── Step 2: Analyse deployed app ──────────────────────────────────
        send(controller, { step: 2, title: 'Analysing Deployed App', status: 'active' });

        interface AppCheckData {
          mainUrl?: { status: number; headers: Record<string, string>; bodyPreview: string; error?: never };
          farcasterManifest?: object | string;
          robotsTxt?: string;
        }
        const appCheckData: AppCheckData = {};

        // Fetch main URL
        try {
          const appRes = await fetch(appUrl.trim(), { signal: AbortSignal.timeout(15_000) });
          const headerMap: Record<string, string> = {};
          appRes.headers.forEach((v, k) => { headerMap[k] = v; });
          appCheckData.mainUrl = {
            status: appRes.status,
            headers: headerMap,
            bodyPreview: (await appRes.text()).slice(0, 5_000),
          };
        } catch (e: unknown) {
          appCheckData.mainUrl = { status: 0, headers: {}, bodyPreview: '', error: e instanceof Error ? e.message : String(e) } as never;
        }

        // Fetch .well-known/farcaster.json from live app
        try {
          const farcasterRes = await fetch(`${appUrl.trim().replace(/\/$/, '')}/.well-known/farcaster.json`, {
            signal: AbortSignal.timeout(8_000),
          });
          if (farcasterRes.ok) {
            appCheckData.farcasterManifest = await farcasterRes.json().catch(() => farcasterRes.text());
          } else {
            appCheckData.farcasterManifest = `HTTP ${farcasterRes.status} — not found`;
          }
        } catch (e: unknown) {
          appCheckData.farcasterManifest = `Fetch error: ${e instanceof Error ? e.message : String(e)}`;
        }

        send(controller, {
          step: 2,
          title: 'App Analysis Complete',
          status: 'done',
          detail: appCheckData.mainUrl?.status
            ? `HTTP ${appCheckData.mainUrl.status} · farcaster.json: ${typeof appCheckData.farcasterManifest === 'object' ? 'found' : 'missing/error'}`
            : 'App unreachable — analysing from repo only',
        });

        // ── Step 3: Claude Sonnet 4.6 deep analysis ────────────────────────
        send(controller, { step: 3, title: 'Claude Sonnet 4.6 Analysing Issues', status: 'active' });

        const filesXml = Object.entries(fileContents)
          .map(([path, { content }]) =>
            `<file path="${path}" size="${content.length}">\n${content.slice(0, 8_000)}\n</file>`
          )
          .join('\n\n');

        const systemPrompt = `You are an expert code repair agent specialising in Base Mini Apps (Farcaster mini-apps on the Base blockchain/Ethereum L2).

Your task: analyse the repository code and live app data, identify ALL issues, and return corrected file content ready to commit.

KEY CHECKLIST:
1. Farcaster Frame / Mini App manifest (/.well-known/farcaster.json):
   - Required fields: accountAssociation, frame.version ("next"), frame.name, frame.iconUrl (https, square, ≤1MB), frame.homeUrl, frame.imageUrl, frame.buttonTitle, frame.splashImageUrl, frame.splashBackgroundColor (#hex)
   - frame.version MUST be "next" (not "1" or "vNext")
   - All URLs must be https
2. Next.js config:
   - images.remotePatterns or domains must include image hosts
   - No X-Frame-Options: DENY / SAMEORIGIN on pages (blocks frame embedding)
   - CSP must allow frame-ancestors for warpcast.com / farcaster.xyz
3. API routes:
   - CORS headers on routes used by the frame
   - Proper error handling returning JSON
4. Package.json: check for outdated or missing @farcaster/miniapp-sdk, viem, wagmi
5. Mobile/responsive: use 100dvh not 100vh
6. TypeScript: catch obvious type errors
7. Environment: no hardcoded secrets, proper NEXT_PUBLIC_ naming

Respond ONLY with valid JSON (no markdown, no code fences). Schema:
{
  "issues": [{ "file": "path or 'live-app'", "issue": "clear description", "severity": "high|medium|low" }],
  "fixes": [{ "file": "exact/path/in/repo", "content": "COMPLETE new file content — no omissions", "description": "concise fix description" }],
  "summary": "2-3 sentence executive summary of findings and fixes."
}

Rules for "fixes":
- Only include files that actually need changes
- "content" must be the COMPLETE file — never truncated, never use ellipsis
- Match the original file style / indentation`;

        const userMessage = `Repository: ${owner}/${repo} (branch: ${defaultBranch})
App URL: ${appUrl}

Live app analysis:
<app_check>
${JSON.stringify(appCheckData, null, 2)}
</app_check>

Repository files:
<files>
${filesXml}
</files>`;

        const claudeRes = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16_000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        const rawText = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text : '';

        interface RepairPlan {
          issues: Array<{ file: string; issue: string; severity: string }>;
          fixes: Array<{ file: string; content: string; description: string }>;
          summary: string;
        }

        let repairPlan: RepairPlan;
        try {
          // Strip any accidental markdown fences
          const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          repairPlan = JSON.parse(jsonMatch?.[0] ?? cleaned) as RepairPlan;
        } catch {
          throw new Error('Claude returned an unexpected response. Please try again.');
        }

        const validFixes = repairPlan.fixes?.filter((f) => f.file && f.content) ?? [];

        send(controller, {
          step: 3,
          title: 'Analysis Complete',
          status: 'done',
          detail: `${repairPlan.issues?.length ?? 0} issue(s) · ${validFixes.length} fix(es) ready`,
        });

        // ── Step 4: Commit fixes to GitHub ─────────────────────────────────
        send(controller, {
          step: 4,
          title: `Committing ${validFixes.length} Fix${validFixes.length !== 1 ? 'es' : ''} to ${defaultBranch}`,
          status: 'active',
        });

        interface CommitResult {
          file: string;
          success: boolean;
          description: string;
          error?: string;
        }
        const commitResults: CommitResult[] = [];

        // Commit sequentially to avoid SHA conflicts in the same tree
        for (const fix of validFixes) {
          try {
            // Get fresh SHA in case a previous commit changed the tree
            const existingFile = fileContents[fix.file];
            let currentSha = existingFile?.sha;

            if (!currentSha) {
              // File might be new, or path differs — try a fresh lookup
              const lookup = await ghFetch(
                `${GITHUB_API}/repos/${owner}/${repo}/contents/${fix.file}?ref=${defaultBranch}`,
                ghHeaders
              );
              if (lookup.ok) {
                const ld = await lookup.json();
                currentSha = ld.sha;
              }
            }

            const commitBody: Record<string, string> = {
              message: `fix(repair-agent): ${fix.description}\n\nApplied by DevRelive Code Repair Agent (Claude Sonnet 4.6)`,
              content: Buffer.from(fix.content, 'utf-8').toString('base64'),
              branch: defaultBranch,
            };
            if (currentSha) commitBody.sha = currentSha;

            const putRes = await fetch(
              `${GITHUB_API}/repos/${owner}/${repo}/contents/${fix.file}`,
              {
                method: 'PUT',
                headers: { ...ghHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(commitBody),
              }
            );

            // Rate limit on commit
            if (putRes.status === 403 || putRes.status === 429) {
              const reset = putRes.headers.get('x-ratelimit-reset');
              const waitSec = reset ? Math.ceil(Number(reset) - Date.now() / 1000) : 60;
              throw new Error(`GitHub API rate limit hit. Resets in ${waitSec}s.`);
            }

            if (putRes.ok) {
              commitResults.push({ file: fix.file, success: true, description: fix.description });
            } else {
              const errData = await putRes.json().catch(() => ({ message: 'unknown error' }));
              commitResults.push({
                file: fix.file,
                success: false,
                description: fix.description,
                error: errData.message ?? `HTTP ${putRes.status}`,
              });
            }
          } catch (e: unknown) {
            commitResults.push({
              file: fix.file,
              success: false,
              description: fix.description,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        const successCount = commitResults.filter((r) => r.success).length;
        const durationMs = Date.now() - startTime;

        send(controller, {
          step: 4,
          title: `${successCount}/${validFixes.length} Fix${validFixes.length !== 1 ? 'es' : ''} Committed`,
          status: 'done',
          detail: successCount > 0
            ? `Pushed directly to ${defaultBranch} branch`
            : 'No files were committed — check errors in the report',
        });

        // ── Step 5: Save to DB & complete ──────────────────────────────────
        const reportData = {
          repoName: `${owner}/${repo}`,
          branch: defaultBranch,
          issuesFound: repairPlan.issues?.length ?? 0,
          issuesFixed: successCount,
          issues: repairPlan.issues ?? [],
          fixes: commitResults,
          summary: repairPlan.summary ?? '',
          commitUrl: `https://github.com/${owner}/${repo}/commits/${defaultBranch}`,
          repoUrl: `https://github.com/${owner}/${repo}`,
          appUrl: appUrl.trim(),
          durationMs,
        };

        // Persist to MongoDB (non-blocking)
        dbConnect()
          .then(() =>
            RepairHistory.create({
              githubUsername: ghUsername,
              repoOwner: owner,
              repoName: repo,
              branch: defaultBranch,
              appUrl: appUrl.trim(),
              repoUrl: repoUrl.trim(),
              issuesFound: reportData.issuesFound,
              issuesFixed: successCount,
              issues: repairPlan.issues ?? [],
              fixes: commitResults,
              summary: repairPlan.summary ?? '',
              commitUrl: reportData.commitUrl,
              durationMs,
              status: successCount === 0 ? 'error' : successCount < validFixes.length ? 'partial' : 'success',
            })
          )
          .catch((e) => console.error('[RepairHistory] DB save failed:', e));

        send(controller, { step: 5, title: 'Repair Complete', status: 'complete', report: reportData });
        controller.close();
      } catch (err: unknown) {
        send(controller, {
          step: -1,
          title: 'Error',
          status: 'error',
          detail: err instanceof Error ? err.message : String(err),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
