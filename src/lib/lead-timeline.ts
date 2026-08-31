import type { CisContactLogHistoryRow } from '@/lib/cis-contact-log-history';
import type { CisContactLogRow } from '@/lib/cis-contact-log-register';
import { decodeCisContactDetail } from '@/lib/fgf-lead-referrer';

/** Funnel stage shown as a badge in the Leads table. */
export type LeadStage = 'register' | 'outbound' | 'walk_in';

/**
 * Timeline granularity is finer than the badge: `inbound` counts as the same funnel
 * stage as `outbound` but is labelled separately so the timeline stays accurate.
 */
export type LeadTimelineEventKind = LeadStage | 'inbound' | 'other';

export type LeadTimelineEvent = {
  id: string;
  kind: LeadTimelineEventKind;
  /** YYYY-MM-DD — kept as raw strings so display never shifts across timezones. */
  date: string;
  /** HH:mm */
  time: string;
  sortKey: string;
  channel: string;
  type: string;
  projectName?: string;
  projectCode?: string;
  note: string;
  utm?: {
    source?: string;
    campaign?: string;
    medium?: string;
    content?: string;
    term?: string;
  };
  /** True for the registration row that the admin clicked on in the Leads table. */
  isOrigin: boolean;
};

type ChannelBearingRow = {
  ContactChannel?: string;
  ContactChannelName?: string;
};

const STAGE_RANK: Record<LeadStage, number> = {
  register: 0,
  outbound: 1,
  walk_in: 2,
};

/**
 * GetContactLogRegister returns `ContactChannelName` while GetContactLog returns
 * `ContactChannel`. Every stage/kind decision must go through this.
 */
export function normalizeContactChannel(row: ChannelBearingRow): string {
  const raw = row.ContactChannel ?? row.ContactChannelName ?? '';
  return String(raw).trim();
}

/**
 * CIS sets `ContactType` to "Register" even on follow-up calls, so the channel is the
 * only trustworthy signal and must be checked first.
 */
export function classifyContactEvent(
  row: ChannelBearingRow & { ContactType?: string },
): LeadTimelineEventKind {
  const channel = normalizeContactChannel(row).toLowerCase();
  const type = String(row.ContactType ?? '').trim().toLowerCase();

  if (channel === 'walk in' || type.startsWith('re-visit')) return 'walk_in';
  if (channel === 'outbound') return 'outbound';
  if (channel === 'inbound') return 'inbound';
  if (channel === 'web site') return 'register';
  return 'other';
}

/** An inbound call is engagement too — same funnel stage as an outbound one. */
export function eventKindToStage(kind: LeadTimelineEventKind): LeadStage | null {
  if (kind === 'inbound') return 'outbound';
  if (kind === 'other') return null;
  return kind;
}

/**
 * Furthest stage the lead reached, not the most recent event — a customer who walked in
 * and was later called back is still `walk_in`.
 *
 * Unrecognised channels resolve to null so a new CIS channel can never move a lead.
 */
export function resolveLeadStage(rows: CisContactLogHistoryRow[]): LeadStage {
  let best: LeadStage = 'register';

  for (const row of rows) {
    const stage = eventKindToStage(classifyContactEvent(row));
    if (stage == null) continue;
    if (STAGE_RANK[stage] > STAGE_RANK[best]) {
      best = stage;
    }
  }

  return best;
}

export function groupHistoryByCustomer(
  rows: CisContactLogHistoryRow[],
): Map<number, CisContactLogHistoryRow[]> {
  const grouped = new Map<number, CisContactLogHistoryRow[]>();

  for (const row of rows) {
    const id = Number(row.CustomerID);
    if (!Number.isFinite(id)) continue;
    const list = grouped.get(id);
    if (list) {
      list.push(row);
    } else {
      grouped.set(id, [row]);
    }
  }

  return grouped;
}

function normalizeDate(value: unknown): string {
  return String(value ?? '').trim().slice(0, 10);
}

function normalizeTime(value: unknown): string {
  return String(value ?? '').trim().slice(0, 5);
}

/**
 * Outbound rows carry a cumulative log ("Call out 3 / ... \r\n Call out 2 / ..."), so every
 * row repeats the history of the rows before it. Only the newest line belongs to this event.
 */
function firstMeaningfulLine(raw: string): string {
  const decoded = decodeCisContactDetail(raw);
  for (const line of decoded.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function eventDedupeKey(date: string, time: string, projectCode: string): string {
  return `${date}|${time}|${projectCode}`;
}

function rowSortKey(row: { ContactDate?: string; ContactTime?: string }): string {
  return `${normalizeDate(row.ContactDate)} ${normalizeTime(row.ContactTime)}`;
}

/**
 * Drop touchpoints that predate the registration.
 *
 * A CIS customer can have years of prior history with AssetWise — a site visit from before
 * they used a Creator Club link is an older relationship, not progress on this lead, and
 * counting it would overstate the stage badge.
 */
export function scopeHistoryToLead(
  rows: CisContactLogHistoryRow[],
  registerRow: CisContactLogRow,
): CisContactLogHistoryRow[] {
  const originKey = `${normalizeDate(registerRow.ContactDate ?? registerRow.RefDate)} ${normalizeTime(registerRow.ContactTime)}`;
  if (!originKey.trim()) return rows;
  return rows.filter((row) => rowSortKey(row) >= originKey);
}

function toUtm(row: {
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}): LeadTimelineEvent['utm'] {
  const utm = {
    source: row.utm_source?.trim() || undefined,
    campaign: row.utm_campaign?.trim() || undefined,
    medium: row.utm_medium?.trim() || undefined,
    content: row.utm_content?.trim() || undefined,
    term: row.utm_term?.trim() || undefined,
  };
  return Object.values(utm).some(Boolean) ? utm : undefined;
}

/**
 * Merge the clicked registration row with the customer's full CIS history.
 *
 * The registration also appears in the history payload, so the duplicate is dropped in
 * favour of the register row (it carries UTM and interest fields the history lacks).
 * Other `Register` rows for the same customer are kept — those are genuine repeat
 * registrations on a different project or campaign.
 */
export function buildLeadTimeline(
  registerRow: CisContactLogRow,
  historyRows: CisContactLogHistoryRow[],
): LeadTimelineEvent[] {
  const originDate = normalizeDate(registerRow.ContactDate ?? registerRow.RefDate);
  const originTime = normalizeTime(registerRow.ContactTime);
  const originProjectCode = String(registerRow.ProjectCode ?? '').trim();

  const originEvent: LeadTimelineEvent = {
    id: 'origin',
    kind: classifyContactEvent(registerRow),
    date: originDate,
    time: originTime,
    sortKey: `${originDate} ${originTime}`,
    channel: normalizeContactChannel(registerRow),
    type: String(registerRow.ContactType ?? '').trim(),
    projectName: String(registerRow.ProjectName ?? '').trim() || undefined,
    projectCode: originProjectCode || undefined,
    // Registration details are single-line and hold the submitted URL — keep them whole.
    note: decodeCisContactDetail(String(registerRow.ContactDetail ?? '')).trim(),
    utm: toUtm(registerRow),
    isOrigin: true,
  };

  const originKey = eventDedupeKey(originDate, originTime, originProjectCode);

  const historyEvents: LeadTimelineEvent[] = [];
  scopeHistoryToLead(historyRows, registerRow).forEach((row, index) => {
    const date = normalizeDate(row.ContactDate);
    const time = normalizeTime(row.ContactTime);
    const projectCode = String(row.ProjectCode ?? '').trim();

    if (eventDedupeKey(date, time, projectCode) === originKey) return;

    historyEvents.push({
      id: `history-${index}`,
      kind: classifyContactEvent(row),
      date,
      time,
      sortKey: `${date} ${time}`,
      channel: normalizeContactChannel(row),
      type: String(row.ContactType ?? '').trim(),
      projectName: String(row.ProjectName ?? '').trim() || undefined,
      projectCode: projectCode || undefined,
      note: firstMeaningfulLine(String(row.ContactDetail ?? '')),
      utm: toUtm(row),
      isOrigin: false,
    });
  });

  return [originEvent, ...historyEvents].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

/** Earliest registration date in the set — used as the CIS history query lower bound. */
export function earliestContactDate(rows: CisContactLogRow[]): string | null {
  let earliest: string | null = null;

  for (const row of rows) {
    const date = normalizeDate(row.ContactDate ?? row.RefDate);
    if (!date) continue;
    if (earliest == null || date < earliest) {
      earliest = date;
    }
  }

  return earliest;
}

export function shiftDateByDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
