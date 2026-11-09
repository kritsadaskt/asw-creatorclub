import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { mapWithConcurrency } from '@/lib/concurrency';
import { resolveAffiliateLinkClickTotals } from '@/lib/resolve-affiliate-link-clicks';
import { isShlinkConfigured } from '@/lib/shlink-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isTinyurlConfigured, parseShortlinkAlias } from '@/lib/tinyurl-server';
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
/** PostgREST returns at most 1000 rows per request. */
const LINK_PAGE_SIZE = 1000;
/**
 * Live TinyURL/Shlink lookups are only a gap-fill. A large miss set (for example
 * when the click cache query fails) used to block this report for about a minute.
 */
const MAX_LIVE_FALLBACK = 24;

const PROFILE_ID_CHUNK = 100;

async function fetchAllAffiliateLinks(): Promise<{ rows: LinkRow[]; error: { message: string } | null }> {
  const rows: LinkRow[] = [];
  for (let from = 0; ; from += LINK_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('affiliate_links')
      .select('id, creator_id, project_id, url, post_links, campaign_name, created_at')
      .order('id', { ascending: true })
      .range(from, from + LINK_PAGE_SIZE - 1);

    if (error) return { rows, error };
    const page = (data ?? []) as LinkRow[];
    rows.push(...page);
    if (page.length < LINK_PAGE_SIZE) break;
  }
  return { rows, error: null };
}

async function fetchRowsByIds(
  ids: string[],
  load: (chunk: string[]) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<{ data: Record<string, unknown>[]; error: { message: string } | null }> {
  const data: Record<string, unknown>[] = [];
  const unique = [...new Set(ids.filter((id) => id.length > 0))];
  for (let i = 0; i < unique.length; i += PROFILE_ID_CHUNK) {
    const { data: page, error } = await load(unique.slice(i, i + PROFILE_ID_CHUNK));
    if (error) return { data, error };
    data.push(...((page ?? []) as Record<string, unknown>[]));
  }
  return { data, error: null };
}

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
    const { rows: linkRows, error: linksError } = await fetchAllAffiliateLinks();

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

    const EXCLUDED_STAT_EMAILS = ['admin@creatorsclub.com', 'admin@creatorclub.com'];

    const allCreatorIds = [...creatorLinkCount.keys()];
    const adminCreatorIds = new Set<string>();
    if (allCreatorIds.length > 0) {
      const { data: adminRows, error: adminError } = await fetchRowsByIds(allCreatorIds, (chunk) =>
        supabaseAdmin.from('profiles').select('id').in('id', chunk).eq('is_admin', true),
      );
      if (adminError) {
        console.error('affiliate-reports profiles is_admin:', adminError);
      } else {
        for (const row of adminRows) {
          const r = row as { id: string };
          adminCreatorIds.add(r.id);
        }
      }
    }

    {
      const { data: excludedRows, error: excludedError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('email', EXCLUDED_STAT_EMAILS);
      if (excludedError) {
        console.error('affiliate-reports excluded emails:', excludedError);
      } else {
        for (const row of excludedRows ?? []) {
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
      const { data: submittedProfiles, error: submittedProfError } = await fetchRowsByIds(
        submittedCreatorIds,
        (chunk) => supabaseAdmin.from('profiles').select('id, name, lastname, type').in('id', chunk),
      );

      if (submittedProfError) {
        console.error('affiliate-reports profiles (submitted posts):', submittedProfError);
      } else {
        for (const p of submittedProfiles) {
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
      const { data: submittedProjects, error: submittedProjError } = await fetchRowsByIds(
        submittedProjectIds,
        (chunk) => supabaseAdmin.from('projects').select('id, name').in('id', chunk),
      );

      if (submittedProjError) {
        console.error('affiliate-reports projects (submitted posts):', submittedProjError);
      } else {
        for (const pr of submittedProjects) {
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

    const creatorEntriesExcludingAdmin = [...creatorLinkCount.entries()].filter(
      ([creatorId]) => !adminCreatorIds.has(creatorId),
    );

    const shlinkConfigured = isTinyurlConfigured() || isShlinkConfigured();
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
        const st = rowToVisitStats(cached);
        if (st?.total != null) linkResolvedClicks.set(row.id, st.total);
        continue;
      }

      if (shlinkConfigured && url) {
        const parsed = parseShortlinkAlias(url);
        if (parsed) {
          fallbackTasks.push({ id: row.id, creatorId, url });
        }
      }
    }

    if (shlinkConfigured && fallbackTasks.length > MAX_LIVE_FALLBACK) {
      console.warn(
        `affiliate-reports: skip live click fallback for ${fallbackTasks.length} links; using cache only`,
      );
    } else if (shlinkConfigured && fallbackTasks.length > 0) {
      await mapWithConcurrency(fallbackTasks, LIVE_FALLBACK_CONCURRENCY, async (task) => {
        const resolved = await resolveAffiliateLinkClickTotals({
          linkId: task.id,
          url: task.url,
          cached: cacheMap.get(task.id),
          persist: false,
        });
        if (resolved?.stats.total != null && Number.isFinite(resolved.stats.total)) {
          linkResolvedClicks.set(task.id, resolved.stats.total);
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

    const rankingCreatorIds = creatorEntriesExcludingAdmin.map(([id]) => id);
    const nameByCreatorId = new Map<string, string>();
    const inviteTypeByCreatorId = new Map<string, string>();
    if (rankingCreatorIds.length > 0) {
      const { data: profiles, error: profError } = await fetchRowsByIds(rankingCreatorIds, (chunk) =>
        supabaseAdmin.from('profiles').select('id, name, lastname, type').in('id', chunk),
      );

      if (profError) {
        console.error('affiliate-reports profiles:', profError);
      } else {
        for (const p of profiles) {
          const r = p as { id: string; name?: string | null; lastname?: string | null; type?: string | null };
          nameByCreatorId.set(r.id, displayNameFromProfile(r.name, r.lastname));
          inviteTypeByCreatorId.set(r.id, (r.type ?? '').trim());
        }
      }
    }

    const topCreators: AdminAffiliateTopCreatorRow[] = creatorEntriesExcludingAdmin.map(
      ([creatorId, linkCount]) => ({
        creatorId,
        displayName: nameByCreatorId.get(creatorId) ?? creatorId.slice(0, 8),
        inviteType: inviteTypeByCreatorId.get(creatorId) ?? '',
        linkCount,
        totalClicks: hasClickSource ? (clicksByCreator.get(creatorId) ?? 0) : null,
      }),
    );

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
      const { data: projects, error: projError } = await fetchRowsByIds(projectIdsNeedingNames, (chunk) =>
        supabaseAdmin.from('projects').select('id, name').in('id', chunk),
      );

      if (projError) {
        console.error('affiliate-reports projects:', projError);
      } else {
        for (const pr of projects) {
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
