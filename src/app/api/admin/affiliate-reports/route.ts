import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { mapWithConcurrency } from '@/lib/concurrency';
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
  AdminAffiliateSubmittedPostLinkRow,
  AdminAffiliateTopCreatorRow,
  AdminAffiliateTopProjectRow,
} from '@/modules/types/adminAffiliateReports';

export type {
  AdminAffiliateReportsResponse,
  AdminAffiliateSubmittedPostLinkRow,
  AdminAffiliateTopCreatorRow,
  AdminAffiliateTopProjectRow,
} from '@/modules/types/adminAffiliateReports';

type LinkRow = {
  id: string;
  creator_id: string;
  project_id: string | null;
  url: string | null;
  post_links?: unknown;
  campaign_name?: string | null;
  created_at?: string | null;
};
const LIVE_FALLBACK_CONCURRENCY = 8;

function normalizePostLinks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function displayNameFromProfile(name: string | null | undefined, lastname: string | null | undefined): string {
  const n = (name ?? '').trim();
  const l = (lastname ?? '').trim();
  if (n && l) return `${n} ${l}`;
  return n || l || '—';
}

export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: linkRows, error: linksError } = await supabaseAdmin
      .from('affiliate_links')
      .select('id, creator_id, project_id, url, post_links, campaign_name, created_at');

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
    const projectAgg = new Map<string | null, { linkCount: number; creators: Set<string> }>();

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

    const allCreatorIds = [...creatorLinkCount.keys()];
    const adminCreatorIds = new Set<string>();
    if (allCreatorIds.length > 0) {
      const { data: adminRows, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('id', allCreatorIds)
        .eq('is_admin', true);
      if (adminError) {
        console.error('affiliate-reports profiles is_admin:', adminError);
      } else {
        for (const row of adminRows ?? []) {
          const r = row as { id: string };
          adminCreatorIds.add(r.id);
        }
      }
    }

    type SubmittedDraft = {
      linkId: string;
      creatorId: string;
      campaignName: string;
      projectId: string | null;
      affiliateUrl: string;
      postLinks: string[];
      createdAt: string;
    };

    const submittedDraft: SubmittedDraft[] = [];
    for (const row of rows) {
      const cid = row.creator_id;
      if (!cid || adminCreatorIds.has(cid)) continue;
      const postLinks = normalizePostLinks(row.post_links);
      if (postLinks.length === 0) continue;
      const linkId = row.id?.trim();
      if (!linkId) continue;
      submittedDraft.push({
        linkId,
        creatorId: cid,
        campaignName: (row.campaign_name ?? '').trim() || '—',
        projectId: row.project_id ?? null,
        affiliateUrl: (row.url ?? '').trim(),
        postLinks,
        createdAt: (row.created_at ?? '').trim() || new Date(0).toISOString(),
      });
    }

    const submittedCreatorIds = [...new Set(submittedDraft.map((d) => d.creatorId))];
    const submittedPostNameById = new Map<string, string>();
    const submittedPostInviteTypeById = new Map<string, string>();
    if (submittedCreatorIds.length > 0) {
      const { data: submittedProfiles, error: submittedProfError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, lastname, type')
        .in('id', submittedCreatorIds);

      if (submittedProfError) {
        console.error('affiliate-reports profiles (submitted posts):', submittedProfError);
      } else {
        for (const p of submittedProfiles ?? []) {
          const r = p as { id: string; name?: string | null; lastname?: string | null; type?: string | null };
          submittedPostNameById.set(r.id, displayNameFromProfile(r.name, r.lastname));
          submittedPostInviteTypeById.set(r.id, (r.type ?? '').trim());
        }
      }
    }

    const submittedProjectIds = [
      ...new Set(submittedDraft.map((d) => d.projectId).filter((id): id is string => id != null && id.length > 0)),
    ];
    const submittedProjectNameById = new Map<string, string>();
    if (submittedProjectIds.length > 0) {
      const { data: submittedProjects, error: submittedProjError } = await supabaseAdmin
        .from('projects')
        .select('id, name')
        .in('id', submittedProjectIds);

      if (submittedProjError) {
        console.error('affiliate-reports projects (submitted posts):', submittedProjError);
      } else {
        for (const pr of submittedProjects ?? []) {
          const r = pr as { id: string; name?: string | null };
          submittedProjectNameById.set(r.id, (r.name ?? '').trim() || r.id);
        }
      }
    }

    const submittedPostAffiliateLinks: AdminAffiliateSubmittedPostLinkRow[] = submittedDraft
      .map((d) => ({
        linkId: d.linkId,
        creatorId: d.creatorId,
        displayName: submittedPostNameById.get(d.creatorId) ?? d.creatorId.slice(0, 8),
        inviteType: submittedPostInviteTypeById.get(d.creatorId) ?? '',
        campaignName: d.campaignName,
        affiliateUrl: d.affiliateUrl,
        postLinks: d.postLinks,
        projectName:
          d.projectId == null || d.projectId === ''
            ? 'ไม่ระบุโครงการ'
            : submittedProjectNameById.get(d.projectId) ?? d.projectId.slice(0, 8),
        createdAt: d.createdAt,
      }))
      .sort((a, b) => {
        const ta = Date.parse(a.createdAt);
        const tb = Date.parse(b.createdAt);
        const na = Number.isFinite(ta) ? ta : 0;
        const nb = Number.isFinite(tb) ? tb : 0;
        return nb - na;
      });

    const linksWithSubmittedPosts = submittedPostAffiliateLinks.length;

    const sortedCreators = [...creatorLinkCount.entries()]
      .filter(([creatorId]) => !adminCreatorIds.has(creatorId))
      .sort((a, b) => b[1] - a[1]);
    const creatorEntriesExcludingAdmin = [...creatorLinkCount.entries()].filter(
      ([creatorId]) => !adminCreatorIds.has(creatorId),
    );

    const topCreatorEntries = sortedCreators.slice(0, 10);
    const topCreatorIds = topCreatorEntries.map(([id]) => id);

    const nameByCreatorId = new Map<string, string>();
    const inviteTypeByCreatorId = new Map<string, string>();
    if (topCreatorIds.length > 0) {
      const { data: profiles, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, lastname, type')
        .in('id', topCreatorIds);

      if (profError) {
        console.error('affiliate-reports profiles:', profError);
      } else {
        for (const p of profiles ?? []) {
          const r = p as { id: string; name?: string | null; lastname?: string | null; type?: string | null };
          nameByCreatorId.set(r.id, displayNameFromProfile(r.name, r.lastname));
          inviteTypeByCreatorId.set(r.id, (r.type ?? '').trim());
        }
      }
    }

    const apiKey = process.env.SHLINK_API_KEY;
    const shlinkConfigured = Boolean(apiKey);
    const totalLinks = creatorEntriesExcludingAdmin.reduce((sum, [, linkCount]) => sum + linkCount, 0);

    const nonAdminRows = rows.filter((r) => r.creator_id && !adminCreatorIds.has(r.creator_id));
    const cacheMap = await getAffiliateLinkClickStatsByIds(nonAdminRows.map((r) => r.id));

    type FallbackTask = { id: string; creatorId: string; url: string };
    const fallbackTasks: FallbackTask[] = [];
    const linkResolvedClicks = new Map<string, number>();

    for (const row of nonAdminRows) {
      const creatorId = row.creator_id!;
      const cached = cacheMap.get(row.id);
      const url = row.url?.trim() ?? '';

      if (cached && cached.total_visits != null && Number.isFinite(cached.total_visits)) {
        const lu = cached.long_url?.trim() ?? '';
        if (lu && longUrlBelongsToCreator(lu, creatorId)) {
          const st = rowToVisitStats(cached);
          if (st?.total != null) linkResolvedClicks.set(row.id, st.total);
          continue;
        }
      }

      if (apiKey && url) {
        const parsed = parseShlinkShortCode(url);
        if (parsed) {
          fallbackTasks.push({ id: row.id, creatorId, url });
        }
      }
    }

    if (apiKey && fallbackTasks.length > 0) {
      await mapWithConcurrency(fallbackTasks, LIVE_FALLBACK_CONCURRENCY, async (task) => {
        const parsed = parseShlinkShortCode(task.url);
        if (!parsed) return;
        const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
        if (!meta) return;
        const longUrl =
          typeof meta.longUrl === 'string'
            ? meta.longUrl
            : typeof meta.originalUrl === 'string'
              ? meta.originalUrl
              : '';
        if (!longUrlBelongsToCreator(longUrl, task.creatorId)) return;
        const stats = visitsFromShlinkShortUrlJson(meta);
        if (stats?.total != null && Number.isFinite(stats.total)) {
          linkResolvedClicks.set(task.id, stats.total);
        }
      });
    }

    const clicksByCreator = new Map<string, number>();
    for (const row of nonAdminRows) {
      const v = linkResolvedClicks.get(row.id);
      if (v == null || !Number.isFinite(v)) continue;
      const cid = row.creator_id!;
      clicksByCreator.set(cid, (clicksByCreator.get(cid) ?? 0) + v);
    }

    const statsSyncedAt = maxSyncedAt(nonAdminRows.map((r) => cacheMap.get(r.id)));
    const hasClickSource = shlinkConfigured || statsSyncedAt != null;

    let totalClicks: number | null = null;
    if (hasClickSource) {
      totalClicks = 0;
      for (const [cid] of creatorEntriesExcludingAdmin) {
        totalClicks += clicksByCreator.get(cid) ?? 0;
      }
    }

    const topCreators: AdminAffiliateTopCreatorRow[] = [];
    for (const [creatorId, linkCount] of topCreatorEntries) {
      const displayName = nameByCreatorId.get(creatorId) ?? creatorId.slice(0, 8);
      const inviteType = inviteTypeByCreatorId.get(creatorId) ?? '';
      topCreators.push({
        creatorId,
        displayName,
        inviteType,
        linkCount,
        totalClicks: hasClickSource ? (clicksByCreator.get(creatorId) ?? 0) : null,
      });
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
      totalLinks,
      totalClicks,
      linksWithSubmittedPosts,
      submittedPostAffiliateLinks,
      statsSyncedAt,
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
