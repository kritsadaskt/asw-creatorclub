/**
 * Import Shlink short-URL CSV into TinyURL.
 *
 * Shlink public shape:  https://assetwise.co.th/c/{code}
 * TinyURL public shape: https://link.assetwise.co.th/{code}  (no /c prefix)
 *
 * Alias is derived by stripping a leading "c/" from shortCode (or last path segment of shortUrl).
 *
 * Expected CSV headers:
 *   "createdAt","domain","shortCode","shortUrl","longUrl","title","tags","visits"
 *
 * Usage:
 *   DRY_RUN=1 node --env-file=.env scripts/import-shlink-csv-to-tinyurl.mjs docs/export.csv
 *   node --env-file=.env scripts/import-shlink-csv-to-tinyurl.mjs docs/export.csv
 *
 * Optional:
 *   DRY_RUN=1
 *   DELAY_MS=200
 *   SKIP_INVALID_ALIAS=1
 *   LIMIT=50
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_BASE = (
  process.env.TINYURL_API_BASE_URL?.includes('api.tinyurl.com')
    ? process.env.TINYURL_API_BASE_URL
    : process.env.TINYURL_OPENAPI_BASE_URL || 'https://api.tinyurl.com'
).replace(/\/+$/, '');
const TOKEN = process.env.TINY_URL_API_KEY || process.env.TINYURL_API_TOKEN || '';
const DOMAIN = process.env.YOUR_TINYURL_DOMAIN || process.env.TINYURL_DOMAIN || 'link.assetwise.co.th';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const DELAY_MS = Number(process.env.DELAY_MS ?? 200);
const SKIP_INVALID_ALIAS = process.env.SKIP_INVALID_ALIAS === '1' || process.env.SKIP_INVALID_ALIAS === 'true';
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null;

/** TinyURL custom aliases: typically 5–30 chars, alphanumeric / - / _ */
const ALIAS_RE = /^[A-Za-z0-9_-]{5,30}$/;

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node --env-file=.env scripts/import-shlink-csv-to-tinyurl.mjs <export.csv>');
  process.exit(1);
}
if (!DRY_RUN && (!TOKEN || !DOMAIN)) {
  console.error('Set TINY_URL_API_KEY (or TINYURL_API_TOKEN) and YOUR_TINYURL_DOMAIN (or TINYURL_DOMAIN).');
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Strip Shlink path prefix "c/" so TinyURL alias is only the code.
 * Examples: "c/7Wysn" → "7Wysn", "7Wysn" → "7Wysn"
 */
function aliasFromShlinkShortCode(shortCode, shortUrl) {
  let raw = (shortCode || '').trim();
  if (raw) {
    raw = raw.replace(/^c\//i, '');
    // If still looks like "c/xxx" nested, take last segment
    if (raw.includes('/')) {
      raw = raw.split('/').filter(Boolean).pop() || raw;
    }
    return raw;
  }
  const url = (shortUrl || '').trim();
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    // …/c/{code} → code
    if (parts.length >= 2 && parts[parts.length - 2].toLowerCase() === 'c') {
      return parts[parts.length - 1] || '';
    }
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
}

function normalizeTags(raw) {
  const t = (raw || '').trim();
  if (!t) return undefined;
  let parts = [];
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) parts = arr.map(String);
    } catch {
      parts = t.split(/[|,]/);
    }
  } else {
    parts = t.split(/[|,]/);
  }
  // TinyURL: each tag max 45 characters
  const cleaned = parts
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.length <= 45);
  return cleaned.length ? cleaned.join(',') : undefined;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isAlreadyExistsPayload(json, text) {
  const blob = `${JSON.stringify(json ?? {})} ${text}`.toLowerCase();
  return (
    blob.includes('already') ||
    blob.includes('taken') ||
    blob.includes('exists') ||
    blob.includes('duplicate') ||
    blob.includes('alias is not available') ||
    blob.includes('not available')
  );
}

async function createTinyUrl({ longUrl, alias, title, tags }) {
  const body = {
    url: longUrl,
    domain: DOMAIN,
    alias,
  };
  if (title?.trim()) body.description = title.trim();
  if (tags) body.tags = tags;

  const res = await fetch(`${API_BASE}/create`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
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
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 500) };
}

const abs = resolve(csvPath);
const summary = { ok: 0, skip: 0, fail: 0, skipReasons: {} };

function bumpSkip(reason) {
  summary.skip += 1;
  summary.skipReasons[reason] = (summary.skipReasons[reason] || 0) + 1;
}

console.log(`CSV: ${abs}`);
console.log(`TinyURL domain: ${DOMAIN}`);
console.log(`API: ${API_BASE}`);
console.log(`Mode: ${DRY_RUN ? 'DRY_RUN' : 'LIVE'}`);
console.log('Alias rule: strip leading "c/" → https://' + DOMAIN + '/{code}');
console.log('Note: visits/createdAt stay in CreatorClub DB, not TinyURL.\n');

const raw = readFileSync(abs, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
if (!lines.length) {
  console.error('CSV is empty');
  process.exit(1);
}

const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').trim());
for (const n of ['shortCode', 'longUrl']) {
  if (!headers.includes(n)) {
    console.error(`Missing required header "${n}". Got: ${headers.join(', ')}`);
    process.exit(1);
  }
}

let processed = 0;
const sampleDry = [];

for (let i = 1; i < lines.length; i++) {
  if (LIMIT != null && processed >= LIMIT) break;

  const cols = parseCsvLine(lines[i]);
  const row = Object.fromEntries(headers.map((h, idx) => [h, cols[idx] ?? '']));
  const shortCodeRaw = (row.shortCode || '').trim();
  const shortUrl = (row.shortUrl || '').trim();
  const longUrl = (row.longUrl || '').trim();
  const title = (row.title || '').trim();
  const tags = normalizeTags(row.tags);
  const alias = aliasFromShlinkShortCode(shortCodeRaw, shortUrl);

  if (!alias || !longUrl) {
    bumpSkip('missing_alias_or_longUrl');
    console.warn(`[skip] row ${i}: missing alias or longUrl (shortCode="${shortCodeRaw}")`);
    continue;
  }

  if (!ALIAS_RE.test(alias)) {
    bumpSkip('invalid_alias');
    console.warn(
      `[skip] row ${i}: alias "${alias}" (from "${shortCodeRaw}") fails TinyURL rules (5–30 chars, [A-Za-z0-9_-])`,
    );
    continue;
  }

  processed += 1;
  const newShortUrl = `https://${DOMAIN}/${alias}`;
  const oldShortUrl = shortUrl || `https://assetwise.co.th/c/${alias}`;

  if (DRY_RUN) {
    summary.ok += 1;
    if (sampleDry.length < 12) {
      sampleDry.push({ old: oldShortUrl, alias, neu: newShortUrl, long: longUrl.slice(0, 70) });
    }
    continue;
  }

  try {
    let result = await createTinyUrl({ longUrl, alias, title, tags });
    // If tags still rejected, retry once without tags (redirect is what matters for seed)
    if (!result.ok && result.status === 422 && tags) {
      const tagErr = `${result.text}`.toLowerCase().includes('tag');
      if (tagErr) {
        result = await createTinyUrl({ longUrl, alias, title, tags: undefined });
      }
    }
    if (result.ok || isAlreadyExistsPayload(result.json, result.text)) {
      summary.ok += 1;
      const tiny = result.json?.data?.tiny_url || result.json?.data?.tinyurl || newShortUrl;
      const note = result.ok ? '' : ' (already exists)';
      console.log(`[ok] ${oldShortUrl} → ${tiny}${note}`);
    } else {
      summary.fail += 1;
      console.error(`[fail] ${oldShortUrl} HTTP ${result.status}: ${result.text}`);
    }
  } catch (err) {
    summary.fail += 1;
    console.error(`[fail] ${oldShortUrl}:`, err instanceof Error ? err.message : err);
  }

  if (DELAY_MS > 0) await sleep(DELAY_MS);
}

if (DRY_RUN && sampleDry.length) {
  console.log('Sample mappings (old → new):');
  for (const s of sampleDry) {
    console.log(`  ${s.old}`);
    console.log(`    → ${s.neu}`);
    console.log(`    → ${s.long}${s.long.length >= 70 ? '…' : ''}`);
  }
  console.log('');
}

console.log('Done:', {
  ...summary,
  wouldCreateOrCreated: summary.ok,
  csvDataRows: lines.length - 1,
  processedValidAlias: processed,
});
if (summary.fail > 0) process.exitCode = 1;
