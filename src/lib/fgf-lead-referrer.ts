/** FGF referrer helpers — ContactDetail (primary) + utm_term fallback (ชื่อ_นามสกุล_เบอร์). */

export type FgfReferrerInfo = {
  firstName: string;
  lastName: string;
  phone: string;
  source: 'contact_detail' | 'utm_term';
};

function sanitizeUtmTermPart(value: string): string {
  return value.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[^\d+]/g, '');
  return digits || trimmed;
}

/** Build utm_term for new FGF CIS rows: ชื่อ_นามสกุล_เบอร์ */
export function buildFgfReferrerUtmTerm(
  firstName: string,
  lastName: string,
  tel: string,
): string {
  const first = sanitizeUtmTermPart(firstName);
  const last = sanitizeUtmTermPart(lastName);
  const phone = normalizePhone(tel);
  return [first, last, phone].filter(Boolean).join('_');
}

/** Parse `Referrer: ชื่อ นามสกุล (เบอร์)` from CIS ContactDetail / Ref. */
export function parseFgfReferrerFromContactDetail(detail: string): FgfReferrerInfo | null {
  const text = decodeCisContactDetail(detail);
  const match = text.match(/Referrer:\s*(.+?)\s*\(([^)]+)\)/i);
  if (!match) return null;

  const fullName = match[1].trim();
  const phone = match[2].trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? fullName;
  const lastName = nameParts.slice(1).join(' ');

  return {
    firstName,
    lastName,
    phone,
    source: 'contact_detail',
  };
}

/** Parse utm_term fallback: ชื่อ_นามสกุล_เบอร์ (last segment = phone). */
export function parseFgfReferrerFromUtmTerm(utmTerm: string): FgfReferrerInfo | null {
  const trimmed = utmTerm.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('_').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const phone = parts[parts.length - 1] ?? '';
  const nameParts = parts.slice(0, -1);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ');

  if (!firstName && !phone) return null;

  return {
    firstName,
    lastName,
    phone,
    source: 'utm_term',
  };
}

/** Prefer ContactDetail; fall back to utm_term when detail was overwritten. */
export function resolveFgfReferrer(row: {
  ContactDetail?: string;
  Ref?: string;
  utm_term?: string;
}): FgfReferrerInfo | null {
  const detail = String(row.ContactDetail ?? row.Ref ?? '').trim();
  if (detail) {
    const fromDetail = parseFgfReferrerFromContactDetail(detail);
    if (fromDetail) return fromDetail;
  }

  const utmTerm = String(row.utm_term ?? '').trim();
  if (utmTerm) {
    return parseFgfReferrerFromUtmTerm(utmTerm);
  }

  return null;
}

export function decodeCisContactDetail(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

export function formatFgfReferrerName(info: FgfReferrerInfo): string {
  return [info.firstName, info.lastName].filter(Boolean).join(' ').trim();
}
