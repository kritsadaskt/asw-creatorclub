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
  // TEMP: show all CIS leads — re-enable name exclusion when done debugging.
  void row;
  return false;
  // const full = contactLogFullName(row);
  // if (!full) return false;
  // return EXCLUDED_CONTACT_LOG_FULL_NAMES.has(full);
}

export function filterExcludedContactLogLeads<T extends ContactLogLike>(rows: T[]): T[] {
  // TEMP: pass through all rows (no exclusion).
  return rows;
}

/** Filters test leads out of CIS API envelope shapes returned by contact-logs. */
export function filterExcludedContactLogsResponse(data: unknown): unknown {
  // TEMP: pass through CIS response unchanged.
  return data;
}
