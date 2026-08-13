/**
 * Local smoke test: affiliate Get Link / TinyURL create path.
 *
 * Layers (run what you need):
 *   1) Env + TinyURL API create + follow redirect
 *   2) Optional: hit local Next.js POST /api/affiliate/shorten (needs approved creator id)
 *
 * Usage:
 *   # TinyURL only (no Next.js required)
 *   node --env-file=.env scripts/test-affiliate-get-link.mjs
 *
 *   # Full path through local app (npm run dev must be running)
 *   TEST_CREATOR_ID=<approved-profile-uuid> \
 *   TEST_PROJECT_URL=https://assetwise.co.th/some-project \
 *   TEST_PROJECT_ID=<project-uuid> \
 *   node --env-file=.env scripts/test-affiliate-get-link.mjs
 *
 * Optional env:
 *   APP_BASE_URL=http://localhost:3000/creatorclub
 *   SKIP_API=1          — skip TinyURL create (env check only)
 *   SKIP_APP=1          — skip local /api/affiliate/shorten even if TEST_CREATOR_ID set
 *   KEEP_ALIAS=1        — print short URL and leave it (default: still leave; TinyURL delete not called)
 */

const TOKEN = process.env.TINY_URL_API_KEY || process.env.TINYURL_API_TOKEN || '';
const DOMAIN = (process.env.YOUR_TINYURL_DOMAIN || process.env.TINYURL_DOMAIN || '')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');
const API_BASE = (
  process.env.TINYURL_OPENAPI_BASE_URL ||
  (process.env.TINYURL_API_BASE_URL?.includes('api.tinyurl.com')
    ? process.env.TINYURL_API_BASE_URL
    : '') ||
  'https://api.tinyurl.com'
).replace(/\/+$/, '');

const GET_LINK_ENABLED = process.env.NEXT_PUBLIC_AFFILIATE_GET_LINK_ENABLED === 'true';
const APP_BASE = (process.env.APP_BASE_URL || 'http://localhost:3000/creatorclub').replace(/\/+$/, '');
const TEST_CREATOR_ID = process.env.TEST_CREATOR_ID?.trim() || '';
const TEST_PROJECT_URL =
  process.env.TEST_PROJECT_URL?.trim() || 'https://assetwise.co.th/?utm_test=get_link_smoke';
const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID?.trim() || '';
const TEST_CAMPAIGN_ID = process.env.TEST_CAMPAIGN_ID?.trim() || '';
const SKIP_API = process.env.SKIP_API === '1' || process.env.SKIP_API === 'true';
const SKIP_APP = process.env.SKIP_APP === '1' || process.env.SKIP_APP === 'true';

function ok(label) {
  console.log(`  ✓ ${label}`);
}
function fail(label, detail) {
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}
function section(title) {
  console.log(`\n== ${title} ==`);
}

function encodeSessionCookie(session) {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

async function headLocation(url) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
  return {
    status: res.status,
    location: res.headers.get('location') || '',
  };
}

async function createTinyurl(longUrl, { alias } = {}) {
  const body = { url: longUrl, domain: DOMAIN };
  if (alias) body.alias = alias;

  const res = await fetch(`${API_BASE}/create`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, text: text.slice(0, 500), json };
}

let failures = 0;

section('1) Config');
if (!TOKEN) {
  fail('TINY_URL_API_KEY / TINYURL_API_TOKEN');
  failures += 1;
} else {
  ok('TinyURL API token present');
}
if (!DOMAIN) {
  fail('YOUR_TINYURL_DOMAIN');
  failures += 1;
} else {
  ok(`domain = ${DOMAIN}`);
}
ok(`API base = ${API_BASE}`);
if (GET_LINK_ENABLED) {
  ok('NEXT_PUBLIC_AFFILIATE_GET_LINK_ENABLED=true');
} else {
  fail(
    'NEXT_PUBLIC_AFFILIATE_GET_LINK_ENABLED',
    'must be exactly true (and restart npm run dev) for UI/API Get Link',
  );
  failures += 1;
}

if (SKIP_API) {
  section('2) TinyURL create (skipped)');
} else if (!TOKEN || !DOMAIN) {
  section('2) TinyURL create (skipped — missing config)');
} else {
  section('2) TinyURL create + redirect');
  const stamp = Date.now().toString(36);
  const longUrl = `https://assetwise.co.th/?ref=smoke_test&t=${stamp}`;
  const created = await createTinyurl(longUrl);

  if (created.status < 200 || created.status >= 300) {
    fail(`POST /create → ${created.status}`, created.text);
    failures += 1;
  } else {
    const data =
      created.json?.data && typeof created.json.data === 'object'
        ? created.json.data
        : created.json;
    const shortUrl =
      (typeof data?.tiny_url === 'string' && data.tiny_url) ||
      (typeof data?.tinyurl === 'string' && data.tinyurl) ||
      '';
    if (!shortUrl) {
      fail('response missing tiny_url', created.text);
      failures += 1;
    } else {
      ok(`created ${shortUrl}`);
      const hop = await headLocation(shortUrl);
      if (hop.status >= 300 && hop.status < 400 && hop.location) {
        ok(`redirect ${hop.status} → ${hop.location.slice(0, 120)}`);
        if (!hop.location.includes('ref=smoke_test')) {
          fail('redirect target missing ref=smoke_test', hop.location.slice(0, 200));
          failures += 1;
        } else {
          ok('long URL contains smoke ref');
        }
      } else {
        fail(`short URL did not redirect`, `${hop.status} ${hop.location || '(no Location)'}`);
        failures += 1;
      }
    }
  }
}

if (SKIP_APP || !TEST_CREATOR_ID) {
  section('3) Local /api/affiliate/shorten');
  if (!TEST_CREATOR_ID) {
    console.log('  · skipped — set TEST_CREATOR_ID=<approved profile uuid> to test app route');
    console.log(`  · example:`);
    console.log(
      `      TEST_CREATOR_ID=... TEST_PROJECT_ID=... node --env-file=.env scripts/test-affiliate-get-link.mjs`,
    );
  } else {
    console.log('  · skipped (SKIP_APP=1)');
  }
} else {
  section('3) Local /api/affiliate/shorten');
  const cookie = `asw_session=${encodeSessionCookie({ id: TEST_CREATOR_ID, role: 'creator' })}`;
  const url = `${APP_BASE}/api/affiliate/shorten`;

  const body = {
    projectUrl: TEST_PROJECT_URL,
    projectId: TEST_PROJECT_ID || undefined,
    campaignId: TEST_CAMPAIGN_ID || undefined,
    campaignName: 'Local smoke test',
    campaignKey: 'local-smoke',
    utmSource: 'creator_club_affiliate',
    utmMedium: 'affiliate',
    utmCampaign: 'creator_club_affiliate',
    utmContent: TEST_CREATOR_ID,
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    fail(`cannot reach ${url}`, err instanceof Error ? err.message : String(err));
    console.log('  · is `npm run dev` running?');
    failures += 1;
    res = null;
  }

  if (res) {
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      fail(`HTTP ${res.status}`, text.slice(0, 400));
      if (json?.code === 'AFFILIATE_GET_LINK_DISABLED') {
        console.log('  · enable flag + restart Next.js');
      }
      if (res.status === 403) {
        console.log('  · creator must be approved (approval_status = 1)');
      }
      failures += 1;
    } else {
      const shortUrl = typeof json?.shortUrl === 'string' ? json.shortUrl : '';
      ok(`HTTP ${res.status} shortUrl=${shortUrl || '(missing)'}`);
      ok(`reused=${Boolean(json?.reused)} linkId=${json?.linkId ?? 'null'}`);

      // Second call should reuse same row when projectId is set
      if (TEST_PROJECT_ID) {
        const res2 = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookie,
          },
          body: JSON.stringify(body),
        });
        const json2 = await res2.json().catch(() => ({}));
        if (res2.ok && json2.reused === true && json2.shortUrl === shortUrl) {
          ok('second call reused existing link (no new TinyURL)');
        } else {
          fail(
            'reuse expected on second call',
            `status=${res2.status} reused=${json2.reused} url=${json2.shortUrl}`,
          );
          failures += 1;
        }
      } else {
        console.log('  · set TEST_PROJECT_ID to assert reuse on second Get Link');
      }
    }
  }
}

section('Result');
if (failures) {
  console.error(`FAILED (${failures} check(s))`);
  process.exitCode = 1;
} else {
  console.log('PASSED');
}
