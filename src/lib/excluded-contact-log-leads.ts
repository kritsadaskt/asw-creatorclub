/** CIS contact log row — field names vary between API versions. */
export type ContactLogLike = {
  CustomerFirstName?: string;
  CustomerLastName?: string;
  Fname?: string;
  Lname?: string;
  [key: string]: unknown;
};

function normalizeFullNameKey(first: string, last: string): string {
  return `${first} ${last}`.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function contactLogFullName(row: ContactLogLike): string {
  const first = String(row.CustomerFirstName ?? row.Fname ?? '').trim();
  const last = String(row.CustomerLastName ?? row.Lname ?? '').trim();
  return normalizeFullNameKey(first, last);
}

/** @deprecated Name exclusion removed — dashboard shows all CIS leads. */
export function isExcludedContactLogLead(_row: ContactLogLike): boolean {
  return false;
}

/** @deprecated Pass-through; no leads are filtered out. */
export function filterExcludedContactLogLeads<T extends ContactLogLike>(rows: T[]): T[] {
  return rows;
}

/** @deprecated Pass-through; no leads are filtered out. */
export function filterExcludedContactLogsResponse(data: unknown): unknown {
  return data;
}
