import { stripHtmlTags } from './strip-html-tags';

export const EVENT_SLUG_MAX_LENGTH = 80;
export const EVENT_SLUG_RESERVED = new Set(['check-in', 'checkin']);

function fallbackSlug(id?: string): string {
  const suffix = (id ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 12)
    .toLowerCase();
  return suffix ? `event-${suffix}` : 'event';
}

/** Build a URL-safe slug from an event name (keeps Thai letters). */
export function slugifyEventName(name: string, fallbackId?: string): string {
  const text = stripHtmlTags(name).normalize('NFKC').toLowerCase();
  const slug = text
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, EVENT_SLUG_MAX_LENGTH)
    .replace(/-$/g, '');

  if (!slug || EVENT_SLUG_RESERVED.has(slug)) {
    return fallbackSlug(fallbackId);
  }
  return slug;
}

export function isUsableEventSlug(slug: string): boolean {
  const value = slug.trim();
  if (!value || EVENT_SLUG_RESERVED.has(value) || value.length > EVENT_SLUG_MAX_LENGTH) {
    return false;
  }
  return /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(value);
}

export function nextEventSlugCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  const suffix = `-${attempt}`;
  const maxBase = Math.max(1, EVENT_SLUG_MAX_LENGTH - suffix.length);
  const truncated = base.slice(0, maxBase).replace(/-$/g, '');
  return `${truncated}${suffix}`;
}

export function eventPreviewPath(slug: string): string {
  return `/event/${slug}`;
}

export function normalizeEventSlugParam(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return '';
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}
