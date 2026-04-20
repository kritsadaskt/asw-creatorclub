import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchShlinkShortUrlMeta,
  longUrlBelongsToCreator,
  parseShlinkShortCode,
  visitsFromShlinkShortUrlJson,
} from '@/lib/shlink-server';
import { getServerSession } from '@/modules/utils/auth';
import type {
  AdminAffiliateReportsResponse,
  AdminAffiliateTopCreatorRow,
  AdminAffiliateTopProjectRow,
} from '@/modules/types/adminAffiliateReports';

export type {
  AdminAffiliateReportsResponse,
  AdminAffiliateTopCreatorRow,
  AdminAffiliateTopProjectRow,
} from '@/modules/types/adminAffiliateReports';

type LinkRow = { creator_id: string; project_id: string | null; url: string | null };

function displayNameFromProfile(name: string | null | undefined, lastname: string | null | undefined): string {
  const n = (name ?? '').trim();
  const l = (lastname ?? '').trim();
  if (n && l) return `${n} ${l}`;
  return n || l || '—';
}

async function sumClicksForCreatorLinks(apiKey: string, creatorId: string, links: LinkRow[]): Promise<number> {
  let sum = 0;
  for (const row of links) {
    const url = row.url?.trim() ?? '';
    if (!url) continue;
    const parsed = parseShlinkShortCode(url);
    if (!parsed) continue;
    const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
    if (!meta) continue;
    const longUrl =
      typeof meta.longUrl === 'string'
        ? meta.longUrl
        : typeof meta.originalUrl === 'string'
          ? meta.originalUrl
          : '';
    if (!longUrlBelongsToCreator(longUrl, creatorId)) continue;
    const stats = visitsFromShlinkShortUrlJson(meta);
    if (stats?.total != null && Number.isFinite(stats.total)) {
      sum += stats.total;
    }
  }
  return sum;
}

export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: linkRows, error: linksError } = await supabaseAdmin
      .from('affiliate_links')
      .select('creator_id, project_id, url');

    if (linksError) {
      console.error('affiliate-reports affiliate_links:', linksError);
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:admin/affiliate-reports',
        severity: 'error',
        message: linksError.message,
        context: requestLogContext(request),
      });
      return NextResponse.json({ error: 'Failed to load affiliate links' }, { status: 500 });
    }

    const rows = (linkRows ?? []) as LinkRow[];

    const creatorLinkCount = new Map<string, number>();
    const creatorLinksMap = new Map<string, LinkRow[]>();
    const projectAgg = new Map<
      string | null,
      { linkCount: number; creators: Set<string> }
    >();

    for (const row of rows) {
      const cid = row.creator_id;
      if (!cid) continue;
      creatorLinkCount.set(cid, (creatorLinkCount.get(cid) ?? 0) + 1);
      const list = creatorLinksMap.get(cid) ?? [];
      list.push(row);
      creatorLinksMap.set(cid, list);

      const pid = row.project_id ?? null;
      const cur = projectAgg.get(pid) ?? { linkCount: 0, creators: new Set<string>() };
      cur.linkCount += 1;
      cur.creators.add(cid);
      projectAgg.set(pid, cur);
    }

    const sortedCreators = [...creatorLinkCount.entries()].sort((a, b) => b[1] - a[1]);
    const topCreatorEntries = sortedCreators.slice(0, 10);
    const topCreatorIds = topCreatorEntries.map(([id]) => id);

    const nameByCreatorId = new Map<string, string>();
    if (topCreatorIds.length > 0) {
      const { data: profiles, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, lastname')
        .in('id', topCreatorIds);

      if (profError) {
        console.error('affiliate-reports profiles:', profError);
      } else {
        for (const p of profiles ?? []) {
          const r = p as { id: string; name?: string | null; lastname?: string | null };
          nameByCreatorId.set(r.id, displayNameFromProfile(r.name, r.lastname));
        }
      }
    }

    const apiKey = process.env.SHLINK_API_KEY;
    const shlinkConfigured = Boolean(apiKey);

    const topCreators: AdminAffiliateTopCreatorRow[] = [];
    for (const [creatorId, linkCount] of topCreatorEntries) {
      const displayName = nameByCreatorId.get(creatorId) ?? creatorId.slice(0, 8);
      let totalClicks: number | null = null;
      if (apiKey) {
        const links = creatorLinksMap.get(creatorId) ?? [];
        totalClicks = await sumClicksForCreatorLinks(apiKey, creatorId, links);
      }
      topCreators.push({ creatorId, displayName, linkCount, totalClicks });
    }

    const projectRanked = [...projectAgg.entries()]
      .map(([projectId, agg]) => ({
        projectId,
        linkCount: agg.linkCount,
        creatorCount: agg.creators.size,
      }))
      .sort((a, b) => b.linkCount - a.linkCount)
      .slice(0, 10);

    const projectIdsNeedingNames = projectRanked
      .map((p) => p.projectId)
      .filter((id): id is string => id != null && id.length > 0);

    const projectNameById = new Map<string, string>();
    if (projectIdsNeedingNames.length > 0) {
      const { data: projects, error: projError } = await supabaseAdmin
        .from('projects')
        .select('id, name')
        .in('id', projectIdsNeedingNames);

      if (projError) {
        console.error('affiliate-reports projects:', projError);
      } else {
        for (const pr of projects ?? []) {
          const r = pr as { id: string; name?: string | null };
          projectNameById.set(r.id, (r.name ?? '').trim() || r.id);
        }
      }
    }

    const topProjects: AdminAffiliateTopProjectRow[] = projectRanked.map((p) => ({
      projectId: p.projectId,
      projectName:
        p.projectId == null
          ? 'ไม่ระบุโครงการ'
          : projectNameById.get(p.projectId) ?? p.projectId.slice(0, 8),
      linkCount: p.linkCount,
      creatorCount: p.creatorCount,
    }));

    const body: AdminAffiliateReportsResponse = {
      topCreators,
      topProjects,
      shlinkConfigured,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error('affiliate-reports error:', err);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/affiliate-reports',
      severity: 'error',
      error: err,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Failed to build affiliate reports' }, { status: 500 });
  }
}
