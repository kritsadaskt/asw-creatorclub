/** CIS contact log row — field names vary between API versions. */
export type ContactLogLike = {
  CustomerFirstName?: string;
  CustomerLastName?: string;
  Fname?: string;
  Lname?: string;
  [key: string]: unknown;
};

/** Known junk / QA full names (normalized lowercase). */
const EXCLUDED_CONTACT_LOG_FULL_NAMES = new Set([
  'klklk klkopo',
  'oioio oioioi',
  'tesat test',
  'yoyo yuyu',
  'test test',
  'test test 2',
]);

function normalizeFullNameKey(first: string, last: string): string {
  return `${first} ${last}`.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function contactLogFirstName(row: ContactLogLike): string {
  return String(row.CustomerFirstName ?? row.Fname ?? '').trim();
}

export function contactLogLastName(row: ContactLogLike): string {
  return String(row.CustomerLastName ?? row.Lname ?? '').trim();
}

export function contactLogFullName(row: ContactLogLike): string {
  return normalizeFullNameKey(contactLogFirstName(row), contactLogLastName(row));
}

/** True when first or last name is exactly "Test" (case-insensitive), or full name is known junk. */
export function isExcludedContactLogLead(row: ContactLogLike): boolean {
  const full = contactLogFullName(row);
  if (full && EXCLUDED_CONTACT_LOG_FULL_NAMES.has(full)) {
    return true;
  }

  const first = contactLogFirstName(row).toLowerCase();
  const last = contactLogLastName(row).toLowerCase();
  return first === 'test' || last === 'test';
}

export function filterExcludedContactLogLeads<T extends ContactLogLike>(rows: T[]): T[] {
  return rows.filter((row) => !isExcludedContactLogLead(row));
}

/** Filters test-name leads out of CIS API envelope shapes returned by contact-logs. */
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
