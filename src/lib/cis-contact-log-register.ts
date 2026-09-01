import type { ContactLogLike } from '@/lib/excluded-contact-log-leads';
import { filterExcludedContactLogLeads } from '@/lib/excluded-contact-log-leads';
import {
  CIS_FETCH_MAX_ATTEMPTS,
  CIS_FETCH_RETRY_DELAY_MS,
  isRetryableCisFailure,
  parseCisDataList,
  postCis,
  sleep,
  type CisFetchFailure,
  type CisFetchResult,
} from '@/lib/cis-http';

const CIS_CONTACT_LOG_ENDPOINT = 'https://api.assetwise.co.th/api/Customer/GetContactLogRegister';

/** Creator Club utm_source values — admin Leads tab merges both. */
export const CIS_CONTACT_LOG_UTM_SOURCES = ['creator_club_affiliate', 'creatorclub'] as const;

export type CisContactLogRow = ContactLogLike & {
  ContactLogID?: number | string;
  ProjectID?: number | string;
  ProjectCode?: string;
  ProjectName?: string;
  CustomerID?: number | string;
  CustomerMobile?: string;
  CustomerGrade?: string;
  /** Register endpoint names this field `ContactChannelName`; GetContactLog uses `ContactChannel`. */
  ContactChannelName?: string;
  ContactChannelID?: number | string;
  ContactType?: string;
  ContactDetail?: string;
  ContactDate?: string;
  ContactTime?: string;
  Email?: string;
  Tel?: string;
  RefDate?: string;
  utm_content?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_term?: string;
};

export type FetchCisContactLogsFailure = CisFetchFailure;
export type FetchCisContactLogsResult = CisFetchResult<CisContactLogRow>;

export function parseCisContactLogList(rawData: unknown): CisContactLogRow[] {
  return parseCisDataList<CisContactLogRow>(rawData);
}

/** CIS expects application/x-www-form-urlencoded (same as Bruno), not JSON. */
function buildCisContactLogFormBody(params?: {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
}): URLSearchParams {
  const body = new URLSearchParams();
  if (params?.utmSource?.trim()) {
    body.append('utm_source', params.utmSource.trim());
  }
  if (params?.utmCampaign?.trim()) {
    body.append('utm_campaign', params.utmCampaign.trim());
  }
  if (params?.utmMedium?.trim()) {
    body.append('utm_medium', params.utmMedium.trim());
  }
  return body;
}

export async function fetchCisContactLogRegisterResult(params?: {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
}): Promise<FetchCisContactLogsResult> {
  const token = process.env.CONTACT_LOGS_TOKEN;
  if (!token?.trim()) {
    return { ok: false, reason: 'CONTACT_LOGS_TOKEN is not configured' };
  }

  return postCis<CisContactLogRow>({
    endpoint: CIS_CONTACT_LOG_ENDPOINT,
    token,
    body: buildCisContactLogFormBody(params),
    label: 'CIS contact-log',
  });
}

export async function fetchCisContactLogRegisterResultWithRetry(params?: {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
}): Promise<FetchCisContactLogsResult> {
  let last: FetchCisContactLogsResult = { ok: false, reason: 'CIS contact-log request failed' };

  for (let attempt = 1; attempt <= CIS_FETCH_MAX_ATTEMPTS; attempt++) {
    last = await fetchCisContactLogRegisterResult(params);
    if (last.ok) return last;
    if (attempt < CIS_FETCH_MAX_ATTEMPTS && isRetryableCisFailure(last)) {
      await sleep(CIS_FETCH_RETRY_DELAY_MS * attempt);
      continue;
    }
    break;
  }

  return last;
}

/** @deprecated Prefer fetchCisContactLogRegisterResult for error details. */
export async function fetchCisContactLogRegister(params?: {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
}): Promise<CisContactLogRow[] | null> {
  const result = await fetchCisContactLogRegisterResult(params);
  return result.ok ? result.data : null;
}

function contactLogRowKey(row: CisContactLogRow): string {
  const contactLogId = row.ContactLogID;
  if (contactLogId != null && contactLogId !== '') {
    return String(contactLogId);
  }

  const customerId = row.CustomerID;
  const projectId = row.ProjectID;
  const contactDate = String(row.ContactDate ?? row.RefDate ?? '').trim();
  const contactTime = String(row.ContactTime ?? '').trim();
  const mobile = String(row.CustomerMobile ?? row.Tel ?? '').trim();
  const utmSource = String(row.utm_source ?? '').trim();

  if (customerId != null && customerId !== '' && projectId != null && projectId !== '') {
    return `${customerId}|${projectId}|${contactDate}|${contactTime}|${utmSource}`;
  }

  return `${mobile}|${contactDate}|${contactTime}|${utmSource}|${String(row.Email ?? '').trim()}`;
}

function mergeContactLogRows(lists: CisContactLogRow[][]): CisContactLogRow[] {
  const seen = new Set<string>();
  const merged: CisContactLogRow[] = [];

  for (const list of lists) {
    for (const row of list) {
      const key = contactLogRowKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
  }

  return merged;
}

/**
 * Admin Leads tab — merge CIS rows from creator_club_affiliate + creatorclub only.
 * (Unfiltered CIS `{}` returns HTTP 500 — do not call without utm_source.)
 */
export async function fetchAllContactLogs(): Promise<FetchCisContactLogsResult> {
  return fetchCreatorClubContactLogsResult();
}

export async function fetchCreatorClubContactLogsResult(): Promise<FetchCisContactLogsResult> {
  // CIS is flaky on concurrent/cold-start requests — fetch sources sequentially with retry.
  const lists: CisContactLogRow[][] = [];
  let lastFailure: FetchCisContactLogsFailure | null = null;

  for (const utmSource of CIS_CONTACT_LOG_UTM_SOURCES) {
    const result = await fetchCisContactLogRegisterResultWithRetry({ utmSource });
    if (result.ok) {
      lists.push(result.data);
      continue;
    }
    lastFailure = result;
  }

  if (lists.length === 0) {
    return (
      lastFailure ?? {
        ok: false,
        reason: 'Failed to fetch Creator Club contact logs',
      }
    );
  }

  return {
    ok: true,
    data: filterExcludedContactLogLeads(mergeContactLogRows(lists)),
  };
}

/** Creator Club CIS leads (both fixed utm_source values) — for attribution / funnel stats. */
export async function fetchCreatorClubContactLogs(): Promise<CisContactLogRow[] | null> {
  const result = await fetchCreatorClubContactLogsResult();
  return result.ok ? result.data : null;
}

/** Count CIS registrations attributed to a creator across all affiliate links. */
export function countCreatorRegistrations(logs: CisContactLogRow[], creatorId: string): number {
  return countAffiliateLinkRegistrations(logs, creatorId, null);
}

/** Count CIS registrations attributed to one affiliate link (creator + optional CIS project). */
export function countAffiliateLinkRegistrations(
  logs: CisContactLogRow[],
  creatorId: string,
  cisProjectId?: number | null,
): number {
  const creatorKey = creatorId.trim();
  if (!creatorKey) return 0;

  return logs.filter((log) => {
    const content = String(log.utm_content ?? '').trim();
    if (content !== creatorKey) return false;

    if (cisProjectId != null && Number.isFinite(cisProjectId)) {
      const rawProjectId = log.ProjectID;
      if (rawProjectId == null || rawProjectId === '') return false;
      if (Number(rawProjectId) !== cisProjectId) return false;
    }

    return true;
  }).length;
}
