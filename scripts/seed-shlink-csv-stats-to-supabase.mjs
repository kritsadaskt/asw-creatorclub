/**
 * Seed Shlink CSV visit totals into CreatorClub DB (matched affiliate_links only).
 *
 * Maps CSV → Supabase:
 *   shortUrl / shortCode  → match affiliate_links.url
 *   visits                → raise affiliate_link_click_stats.shlink_baseline
 *                           total_visits = shlink_baseline + tinyurl_hits
 *   longUrl               → affiliate_link_click_stats.long_url
 *   createdAt             → affiliate_links.created_at (optional)
 *
 * Does NOT insert new affiliate_links for unmatched CSV rows.
 *
 * Expected CSV headers:
 *   "createdAt","domain","shortCode","shortUrl","longUrl","title","tags","visits"
 *
 * Usage:
 *   node --env-file=.env scripts/seed-shlink-csv-stats-to-supabase.mjs path/to/export.csv
 *
 * Optional:
 *   DRY_RUN=1
 *   LIMIT=50
 *   UPDATE_CREATED_AT=0   — skip updating affiliate_links.created_at (default: update)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node --env-file=.env scripts/seed-shlink-csv-stats-to-supabase.mjs <export.csv>');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null;
const UPDATE_CREATED_AT = process.env.UPDATE_CREATED_AT !== '0' && process.env.UPDATE_CREATED_AT !== 'false';

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. node --env-file=.env …)');
  process.exit(1);
}

const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

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

function normalizeUrl(u) {
  return (u || '').trim().replace(/\/+$/, '');
}

function aliasFromShortCode(shortCode) {
  const code = (shortCode || '').trim();
  if (!code) return '';
  return code.includes('/') ? code.split('/').filter(Boolean).pop() || '' : code;
}

function parseVisits(raw) {
  const n = Number(String(raw ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function parseCreatedAt(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function urlsMatch(linkUrl, shortUrl, shortCode) {
  const a = normalizeUrl(linkUrl);
  const b = normalizeUrl(shortUrl);
  if (a && b && a === b) return true;
  const last = aliasFromShortCode(shortCode);
  if (!last) return false;
  try {
    const u = new URL(a.startsWith('http') ? a : `https://${a}`);
    const path = u.pathname.replace(/\/+$/, '');
    const pathLast = path.split('/').filter(Boolean).pop() || '';
    return pathLast === last;
  } catch {
    return a.endsWith(`/${last}`) || a.endsWith(last);
  }
}

const abs = resolve(csvPath);
const summary = {
  matched: 0,
  unmatched: 0,
  statsOk: 0,
  statsUnchanged: 0,
  createdAtOk: 0,
  fail: 0,
};

console.log(`CSV: ${abs}`);
console.log(`Mode: ${DRY_RUN ? 'DRY_RUN' : 'LIVE'}`);
console.log(`Update created_at: ${UPDATE_CREATED_AT ? 'yes' : 'no'}\n`);

/** @type {Map<string, { id: string; url: string; created_at: string | null }[]>} */
const byExactUrl = new Map();
/** @type {{ id: string; url: string; created_at: string | null }[]} */
let allLinks = [];
/** @type {Map<string, { total: number | null; baseline: number | null; tinyHits: number | null }>} */
const existingVisits = new Map();

if (!DRY_RUN && supabase) {
  const links = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('affiliate_links')
      .select('id, url, created_at')
      .range(from, from + 999);
    if (error) {
      console.error('Failed to load affiliate_links:', error.message);
      process.exit(1);
    }
    links.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  allLinks = links.map((r) => ({
    id: r.id,
    url: r.url ?? '',
    created_at: r.created_at ?? null,
  }));
  for (const link of allLinks) {
    const key = normalizeUrl(link.url);
    if (!key) continue;
    const list = byExactUrl.get(key) ?? [];
    list.push(link);
    byExactUrl.set(key, list);
  }

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('affiliate_link_click_stats')
      .select('affiliate_link_id, total_visits, shlink_baseline, tinyurl_hits')
      .range(from, from + 999);
    if (error) {
      console.error('Failed to load affiliate_link_click_stats:', error.message);
      process.exit(1);
    }
    for (const row of data ?? []) {
      existingVisits.set(row.affiliate_link_id, {
        total: row.total_visits == null ? null : Number(row.total_visits),
        baseline: row.shlink_baseline == null ? null : Number(row.shlink_baseline),
        tinyHits: row.tinyurl_hits == null ? null : Number(row.tinyurl_hits),
      });
    }
    if (!data || data.length < 1000) break;
  }

  console.log(`Loaded ${allLinks.length} affiliate_links, ${existingVisits.size} click_stats rows\n`);
}

function findMatches(shortUrl, shortCode) {
  const exact = byExactUrl.get(normalizeUrl(shortUrl));
  if (exact?.length) return exact;
  return allLinks.filter((l) => urlsMatch(l.url, shortUrl, shortCode));
}

const raw = readFileSync(abs, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
if (!lines.length) {
  console.error('CSV is empty');
  process.exit(1);
}

const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').trim());
for (const n of ['shortCode', 'shortUrl', 'visits', 'createdAt']) {
  if (!headers.includes(n)) {
    console.error(`Missing header "${n}". Got: ${headers.join(', ')}`);
    process.exit(1);
  }
}

const nowIso = new Date().toISOString();
let processed = 0;

for (let i = 1; i < lines.length; i++) {
  if (LIMIT != null && processed >= LIMIT) break;
  processed += 1;

  const cols = parseCsvLine(lines[i]);
  const row = Object.fromEntries(headers.map((h, idx) => [h, cols[idx] ?? '']));
  const shortCode = (row.shortCode || '').trim();
  const shortUrl = (row.shortUrl || '').trim();
  const longUrl = (row.longUrl || '').trim();
  const visits = parseVisits(row.visits);
  const createdAt = parseCreatedAt(row.createdAt);

  if (DRY_RUN) {
    summary.matched += 1;
    continue;
  }

  const matches = findMatches(shortUrl, shortCode);
  if (!matches.length) {
    summary.unmatched += 1;
    continue;
  }

  summary.matched += 1;

  for (const link of matches) {
    try {
      if (visits != null) {
        const prev = existingVisits.get(link.id) ?? {
          total: null,
          baseline: null,
          tinyHits: null,
        };
        const prevBaseline =
          prev.baseline != null && Number.isFinite(prev.baseline)
            ? Math.max(0, Math.trunc(prev.baseline))
            : prev.total != null && Number.isFinite(prev.total)
              ? Math.max(0, Math.trunc(prev.total))
              : 0;
        const tinyHits =
          prev.tinyHits != null && Number.isFinite(prev.tinyHits)
            ? Math.max(0, Math.trunc(prev.tinyHits))
            : 0;
        const nextBaseline = Math.max(prevBaseline, visits);
        const nextTotal = nextBaseline + tinyHits;

        if (prev.baseline === nextBaseline && prev.total === nextTotal) {
          summary.statsUnchanged += 1;
        } else {
          const { error: upErr } = await supabase.from('affiliate_link_click_stats').upsert(
            {
              affiliate_link_id: link.id,
              shlink_baseline: nextBaseline,
              tinyurl_hits: tinyHits,
              total_visits: nextTotal,
              long_url: longUrl || null,
              synced_at: nowIso,
            },
            { onConflict: 'affiliate_link_id' },
          );
          if (upErr) throw upErr;
          summary.statsOk += 1;
          existingVisits.set(link.id, {
            total: nextTotal,
            baseline: nextBaseline,
            tinyHits,
          });
          console.log(
            `[ok] ${shortCode} link=${link.id} baseline ${prevBaseline} → ${nextBaseline} (tiny=${tinyHits}, total=${nextTotal})`,
          );
        }
      }

      if (UPDATE_CREATED_AT && createdAt) {
        const { error: caErr } = await supabase
          .from('affiliate_links')
          .update({ created_at: createdAt })
          .eq('id', link.id);
        if (caErr) throw caErr;
        summary.createdAtOk += 1;
      }
    } catch (err) {
      summary.fail += 1;
      console.error(`[fail] ${shortCode} link ${link.id}:`, err instanceof Error ? err.message : err);
    }
  }
}

console.log('\nDone:', summary);
if (summary.fail > 0) process.exitCode = 1;
