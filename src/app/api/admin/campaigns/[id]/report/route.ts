import { NextRequest, NextResponse } from 'next/server';
import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { mapWithConcurrency } from '@/lib/concurrency';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchShlinkShortUrlMeta,
  parseShlinkShortCode,
  visitsFromShlinkShortUrlJson,
} from '@/lib/shlink-server';
import { getServerSession } from '@/modules/utils/auth';

type LinkRow = {
  id: string;
  creator_id: string | null;
  project_id: string | null;
  url: string | null;
};

type TopCreatorRow = {
  creatorId: string;
  displayName: string;
  inviteType: string;
  linkCount: number;
};

type TopLinkRow = {
  affiliateLinkId: string;
  shortUrl: string;
  projectId: string | null;
  projectName: string;
  creatorId: string | null;
  creatorDisplayName: string;
  clicks: number | null;
};

const LIVE_CONCURRENCY = 8;

function displayNameFromProfile(name: string | null | undefined, lastname: string | null | undefined): string {
  const first = (name ?? '').trim();
  const last = (lastname ?? '').trim();
  if (first && last) return `${first} ${last}`;
  return first || last || '—';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: campaignId } = await params;
  if (!campaignId) {
    return NextResponse.json({ error: 'campaign id is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, creator_id, project_id, url')
    .eq('campaign_id', campaignId);

  if (error) {
    return NextResponse.json({ error: 'Failed to load campaign links' }, { status: 500 });
  }

  const rows = (data ?? []) as LinkRow[];
  const creators = new Set<string>();
  const projects = new Set<string>();
  const creatorLinkCount = new Map<string, number>();
  const linkClicks = new Map<string, number>();

  for (const row of rows) {
    if (row.creator_id) {
      creators.add(row.creator_id);
      creatorLinkCount.set(row.creator_id, (creatorLinkCount.get(row.creator_id) ?? 0) + 1);
    }
    if (row.project_id) projects.add(row.project_id);
  }

  const apiKey = process.env.SHLINK_API_KEY;
  const cacheMap = await getAffiliateLinkClickStatsByIds(rows.map((r) => r.id));
  const liveTasks: { id: string; shortUrl: string }[] = [];

  for (const row of rows) {
    const shortUrl = row.url?.trim() ?? '';
    if (!shortUrl) continue;
    const parsed = parseShlinkShortCode(shortUrl);
    if (!parsed) continue;

    const cached = cacheMap.get(row.id);
    const visit = cached ? rowToVisitStats(cached) : null;
    if (visit?.total != null && Number.isFinite(visit.total)) {
      linkClicks.set(row.id, visit.total);
      continue;
    }

    if (apiKey) {
      liveTasks.push({ id: row.id, shortUrl });
    }
  }

  if (apiKey && liveTasks.length > 0) {
    await mapWithConcurrency(liveTasks, LIVE_CONCURRENCY, async (task) => {
      const parsed = parseShlinkShortCode(task.shortUrl);
      if (!parsed) return;
      const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
      if (!meta) return;
      const v = visitsFromShlinkShortUrlJson(meta);
      if (v?.total != null && Number.isFinite(v.total)) {
        linkClicks.set(task.id, v.total);
      }
    });
  }

  const statsSyncedAt = maxSyncedAt(rows.map((r) => cacheMap.get(r.id)));
  const hasClickSource = Boolean(apiKey) || statsSyncedAt != null;

  let totalClicks: number | null = null;
  if (hasClickSource) {
    totalClicks = 0;
    for (const row of rows) {
      totalClicks += linkClicks.get(row.id) ?? 0;
    }
  }

  const topCreatorIds = [...creatorLinkCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([creatorId]) => creatorId);
  const creatorProfileMap = new Map<string, { displayName: string; inviteType: string }>();
  if (topCreatorIds.length > 0) {
    const { data: creatorProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, lastname, type')
      .in('id', topCreatorIds);
    for (const profile of creatorProfiles ?? []) {
      const p = profile as { id: string; name?: string | null; lastname?: string | null; type?: string | null };
      creatorProfileMap.set(p.id, {
        displayName: displayNameFromProfile(p.name, p.lastname),
        inviteType: (p.type ?? '').trim(),
      });
    }
  }

  const topCreators: TopCreatorRow[] = [...creatorLinkCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([creatorId, linkCount]) => {
      const profile = creatorProfileMap.get(creatorId);
      return {
        creatorId,
        displayName: profile?.displayName ?? creatorId.slice(0, 8),
        inviteType: profile?.inviteType ?? '',
        linkCount,
      };
    });

  const projectNameMap = new Map<string, string>();
  const projectIds = [...projects];
  if (projectIds.length > 0) {
    const { data: projectRows } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .in('id', projectIds);
    for (const row of projectRows ?? []) {
      const p = row as { id: string; name?: string | null };
      projectNameMap.set(p.id, (p.name ?? '').trim() || p.id);
    }
  }

  const creatorNameMap = new Map<string, string>();
  if (creators.size > 0) {
    const { data: creatorRows } = await supabaseAdmin
      .from('profiles')
      .select('id, name, lastname')
      .in('id', [...creators]);
    for (const row of creatorRows ?? []) {
      const c = row as { id: string; name?: string | null; lastname?: string | null };
      creatorNameMap.set(c.id, displayNameFromProfile(c.name, c.lastname));
    }
  }

  const topLinks: TopLinkRow[] = rows
    .map((row) => ({
      affiliateLinkId: row.id,
      shortUrl: row.url?.trim() ?? '',
      projectId: row.project_id,
      projectName:
        row.project_id == null ? 'ไม่ระบุโครงการ' : projectNameMap.get(row.project_id) ?? row.project_id.slice(0, 8),
      creatorId: row.creator_id,
      creatorDisplayName: row.creator_id ? creatorNameMap.get(row.creator_id) ?? row.creator_id.slice(0, 8) : '—',
      clicks: hasClickSource ? (linkClicks.get(row.id) ?? 0) : null,
    }))
    .filter((row) => row.shortUrl.length > 0)
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, 10);

  return NextResponse.json({
    campaignId,
    linkCount: rows.length,
    creatorCount: creators.size,
    projectCount: projects.size,
    totalClicks,
    shlinkConfigured: Boolean(apiKey),
    statsSyncedAt,
    topCreators,
    topLinks,
  });
}
