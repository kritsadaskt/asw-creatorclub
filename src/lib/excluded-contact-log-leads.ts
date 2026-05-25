/** CIS contact log row — field names vary between API versions. */
export type ContactLogLike = {
  CustomerFirstName?: string;
  CustomerLastName?: string;
  Fname?: string;
  Lname?: string;
  [key: string]: unknown;
};

/** Normalized "ชื่อ นามสกุล" keys for test leads to hide from admin UTM tables. */
export const EXCLUDED_CONTACT_LOG_FULL_NAMES = new Set([
  'klklk klkopo',
  'oioio oioioi',
  'tesat test',
  'yoyo yuyu',
  'Test Test',
  'Test Test 2',
]);

function normalizeFullNameKey(first: string, last: string): string {
  return `${first} ${last}`.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function contactLogFullName(row: ContactLogLike): string {
  const first = String(row.CustomerFirstName ?? row.Fname ?? '').trim();
  const last = String(row.CustomerLastName ?? row.Lname ?? '').trim();
  return normalizeFullNameKey(first, last);
}

export function isExcludedContactLogLead(row: ContactLogLike): boolean {
  const full = contactLogFullName(row);
  if (!full) return false;
  return EXCLUDED_CONTACT_LOG_FULL_NAMES.has(full);
}

export function filterExcludedContactLogLeads<T extends ContactLogLike>(rows: T[]): T[] {
  return rows.filter((row) => !isExcludedContactLogLead(row));
}

/** Filters test leads out of CIS API envelope shapes returned by contact-logs. */
export function filterExcludedContactLogsResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return filterExcludedContactLogLeads(data as ContactLogLike[]);
  }
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.Data)) {
    return { ...obj, Data: filterExcludedContactLogLeads(obj.Data as ContactLogLike[]) };
  }
  if (Array.isArray(obj.data)) {
    return { ...obj, data: filterExcludedContactLogLeads(obj.data as ContactLogLike[]) };
  }
  return data;
}
