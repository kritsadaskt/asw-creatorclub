import type { ContactLogLike } from '@/lib/excluded-contact-log-leads';
import { filterExcludedContactLogLeads } from '@/lib/excluded-contact-log-leads';

const CIS_CONTACT_LOG_ENDPOINT = 'https://api.assetwise.co.th/api/Customer/GetContactLogRegister';

/** Soft timeout per CIS request. */
const CIS_FETCH_TIMEOUT_MS = 55_000;
const CIS_FETCH_MAX_ATTEMPTS = 3;
const CIS_FETCH_RETRY_DELAY_MS = 700;

/** Creator Club utm_source values — admin Leads tab merges both. */
export const CIS_CONTACT_LOG_UTM_SOURCES = ['creator_club_affiliate', 'creatorclub'] as const;

export type CisContactLogRow = ContactLogLike & {
  ContactLogID?: number | string;
  ProjectID?: number | string;
  CustomerID?: number | string;
  CustomerMobile?: string;
  ContactDate?: string;
  ContactTime?: string;
  Email?: string;
  Tel?: string;
  RefDate?: string;
  utm_content?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
};

export type FetchCisContactLogsFailure = {
  ok: false;
  reason: string;
  status?: number;
};

export type FetchCisContactLogsResult =
  | { ok: true; data: CisContactLogRow[] }
  | FetchCisContactLogsFailure;

export function parseCisContactLogList(rawData: unknown): CisContactLogRow[] {
  if (!rawData || typeof rawData !== 'object') return [];
  if (Array.isArray(rawData)) {
    return rawData as CisContactLogRow[];
  }
  const obj = rawData as Record<string, unknown>;
  if (Array.isArray(obj.Data)) {
    return obj.Data as CisContactLogRow[];
  }
  if (Array.isArray(obj.data)) {
    return obj.data as CisContactLogRow[];
  }
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableCisFailure(result: FetchCisContactLogsFailure): boolean {
  if (result.status != null && result.status >= 500) return true;
  return (
    result.reason.includes('timed out') ||
    result.reason.includes('request failed') ||
    result.reason.includes('Success=false')
  );
}

function parseCisContactLogResponse(responseData: unknown): FetchCisContactLogsResult {
  if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
    const obj = responseData as Record<string, unknown>;
    if (obj.Success === false) {
      return {
        ok: false,
        reason: `CIS returned Success=false: ${String(obj.Message ?? 'unknown error')}`,
      };
    }
  }

  return { ok: true, data: parseCisContactLogList(responseData) };
}

function authorizationHeader(token: string): string {
  const trimmed = token.trim();
  return trimmed.toLowerCase().startsWith('basic ') ? trimmed : `Basic ${trimmed}`;
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CIS_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(CIS_CONTACT_LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authorizationHeader(token),
      },
      body: buildCisContactLogFormBody(params).toString(),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      reason: aborted
        ? `CIS contact-log request timed out after ${CIS_FETCH_TIMEOUT_MS}ms`
        : err instanceof Error
          ? `CIS contact-log request failed: ${err.message}`
          : 'CIS contact-log request failed',
    };
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await res.text().catch(() => '');
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      reason: `CIS returned HTTP ${res.status}${responseText ? `: ${responseText.slice(0, 300)}` : ''}`,
    };
  }

  let responseData: unknown;
  try {
    responseData = responseText ? JSON.parse(responseText) : null;
  } catch {
    return {
      ok: false,
      status: res.status,
      reason: 'CIS returned a non-JSON body',
    };
  }

  return parseCisContactLogResponse(responseData);
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
