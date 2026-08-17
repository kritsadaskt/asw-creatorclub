import type { ContactLogLike } from '@/lib/excluded-contact-log-leads';

const CIS_CONTACT_LOG_ENDPOINT = 'https://api.assetwise.co.th/api/Customer/GetContactLogRegister';

/** Sources used for Creator Club attribution/funnel counts (not the admin Leads list). */
export const CIS_CONTACT_LOG_UTM_SOURCES = ['creator_club_affiliate', 'creatorclub'] as const;

export type CisContactLogRow = ContactLogLike & {
  ContactLogID?: number | string;
  ProjectID?: number | string;
  Email?: string;
  Tel?: string;
  RefDate?: string;
  utm_content?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
};

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

export async function fetchCisContactLogRegister(params?: {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
}): Promise<CisContactLogRow[] | null> {
  const token = process.env.CONTACT_LOGS_TOKEN;
  if (!token) return null;

  const payloadBody: Record<string, string> = {};
  if (params?.utmSource?.trim()) {
    payloadBody.utm_source = params.utmSource.trim();
  }
  if (params?.utmCampaign?.trim()) {
    payloadBody.utm_campaign = params.utmCampaign.trim();
  }
  if (params?.utmMedium?.trim()) {
    payloadBody.utm_medium = params.utmMedium.trim();
  }

  const res = await fetch(CIS_CONTACT_LOG_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${token}`,
    },
    body: JSON.stringify(payloadBody),
  });

  if (!res.ok) return null;

  const responseText = await res.text();
  let responseData: unknown;
  try {
    responseData = responseText ? JSON.parse(responseText) : null;
  } catch {
    return null;
  }

  return parseCisContactLogList(responseData);
}

function mergeContactLogRows(lists: CisContactLogRow[][]): CisContactLogRow[] {
  const seen = new Set<string>();
  const merged: CisContactLogRow[] = [];

  for (const list of lists) {
    for (const row of list) {
      const id = row.ContactLogID;
      const key =
        id != null && id !== ''
          ? String(id)
          : `${row.Email ?? ''}|${row.Tel ?? ''}|${row.RefDate ?? ''}|${row.utm_source ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
  }

  return merged;
}

/**
 * All CIS contact-log rows for admin Leads tab — no utm_source / campaign / medium / name filters.
 * If unfiltered CIS call returns empty, falls back to merging known Creator Club sources.
 */
export async function fetchAllContactLogs(): Promise<CisContactLogRow[] | null> {
  const unfiltered = await fetchCisContactLogRegister();
  if (unfiltered == null) return null;
  if (unfiltered.length > 0) return unfiltered;

  // Some CIS environments require utm_source — fall back to known Creator Club sources only.
  return fetchCreatorClubContactLogs();
}

/** Creator Club CIS leads (both fixed utm_source values) — for attribution / funnel stats. */
export async function fetchCreatorClubContactLogs(): Promise<CisContactLogRow[] | null> {
  const results = await Promise.all(
    CIS_CONTACT_LOG_UTM_SOURCES.map((utmSource) => fetchCisContactLogRegister({ utmSource })),
  );

  if (results.every((list) => list == null)) return null;

  return mergeContactLogRows(results.filter((list): list is CisContactLogRow[] => list != null));
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
