import {
  filterExcludedContactLogLeads,
  type ContactLogLike,
} from '@/lib/excluded-contact-log-leads';

const CIS_CONTACT_LOG_ENDPOINT = 'https://api.assetwise.co.th/api/Customer/GetContactLogRegister';

export type CisContactLogRow = ContactLogLike & {
  ProjectID?: number | string;
  utm_content?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
};

export function parseCisContactLogList(rawData: unknown): CisContactLogRow[] {
  if (!rawData || typeof rawData !== 'object') return [];
  if (Array.isArray(rawData)) {
    return filterExcludedContactLogLeads(rawData as CisContactLogRow[]);
  }
  const obj = rawData as Record<string, unknown>;
  if (Array.isArray(obj.Data)) {
    return filterExcludedContactLogLeads(obj.Data as CisContactLogRow[]);
  }
  if (Array.isArray(obj.data)) {
    return filterExcludedContactLogLeads(obj.data as CisContactLogRow[]);
  }
  return [];
}

export async function fetchCisContactLogRegister(params: {
  utmSource: string;
  utmCampaign?: string;
  utmMedium?: string;
}): Promise<CisContactLogRow[] | null> {
  const token = process.env.CONTACT_LOGS_TOKEN;
  if (!token) return null;

  const payloadBody: Record<string, string> = {
    utm_source: params.utmSource.trim(),
  };
  if (params.utmCampaign?.trim()) {
    payloadBody.utm_campaign = params.utmCampaign.trim();
  }
  if (params.utmMedium?.trim()) {
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
