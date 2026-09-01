import { postCisWithRetry, type CisFetchResult } from '@/lib/cis-http';

const CIS_CONTACT_LOG_HISTORY_ENDPOINT = 'https://api.assetwise.co.th/api/Customer/GetContactLog';

/**
 * Every touchpoint CIS recorded for a customer — register, follow-up calls, site visits.
 * Complements GetContactLogRegister, which only returns the registration row.
 */
export type CisContactLogHistoryRow = {
  BUName?: string;
  ProjectCode?: string;
  ProjectName?: string;
  CustomerID?: number | string;
  CustomerFirstName?: string;
  CustomerLastName?: string;
  CustomerMobile?: string;
  /** Web Site | Outbound | Walk In — named `ContactChannelName` on the register endpoint. */
  ContactChannel?: string;
  ContactType?: string;
  ContactDate?: string;
  ContactTime?: string;
  ContactDetail?: string;
  CustomerGrade?: string;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
};

export type FetchCisContactLogHistoryResult = CisFetchResult<CisContactLogHistoryRow>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCisDate(value: string): boolean {
  return DATE_PATTERN.test(value.trim());
}

/**
 * Fetch contact history for the given customers in one CIS call.
 *
 * CustomerIDs is sent as a JSON array — unlike GetContactLogRegister, this endpoint
 * accepts a JSON body.
 */
export async function fetchCisContactLogHistory(params: {
  customerIds: Array<number | string>;
  startDate: string;
  endDate: string;
}): Promise<FetchCisContactLogHistoryResult> {
  const token = process.env.CONTACT_LOGS_TOKEN;
  if (!token?.trim()) {
    return { ok: false, reason: 'CONTACT_LOGS_TOKEN is not configured' };
  }

  const customerIds = normalizeCustomerIds(params.customerIds);
  if (customerIds.length === 0) {
    return { ok: true, data: [] };
  }

  if (!isValidCisDate(params.startDate) || !isValidCisDate(params.endDate)) {
    return { ok: false, reason: 'startDate and endDate must be formatted as YYYY-MM-DD' };
  }

  return postCisWithRetry<CisContactLogHistoryRow>({
    endpoint: CIS_CONTACT_LOG_HISTORY_ENDPOINT,
    token,
    body: {
      StartDate: params.startDate.trim(),
      EndDate: params.endDate.trim(),
      CustomerIDs: customerIds,
    },
    label: 'CIS contact-log history',
  });
}

export function normalizeCustomerIds(values: Array<number | string>): number[] {
  const seen = new Set<number>();
  for (const value of values) {
    const id = Number(value);
    if (!Number.isFinite(id) || id <= 0) continue;
    seen.add(id);
  }
  return [...seen];
}
