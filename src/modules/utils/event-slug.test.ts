import { describe, expect, it } from 'vitest';
import {
  eventPreviewPath,
  isUsableEventSlug,
  nextEventSlugCandidate,
  normalizeEventSlugParam,
  slugifyEventName,
} from './event-slug';

describe('slugifyEventName', () => {
  it('slugifies latin names', () => {
    expect(slugifyEventName('Creator Club Meetup 2026')).toBe('creator-club-meetup-2026');
  });

  it('strips html and keeps thai letters', () => {
    expect(slugifyEventName('<p>งาน Creator Club</p>')).toBe('งาน-creator-club');
  });

  it('falls back when the name is empty or reserved', () => {
    expect(slugifyEventName('', 'a1b2c3d4-e5f6')).toBe('event-a1b2c3d4e5f6');
    expect(slugifyEventName('Check-in', 'abc-123')).toBe('event-abc123');
  });
});

describe('isUsableEventSlug', () => {
  it('accepts generated slugs and rejects reserved paths', () => {
    expect(isUsableEventSlug('งาน-creator-club')).toBe(true);
    expect(isUsableEventSlug('check-in')).toBe(false);
    expect(isUsableEventSlug('')).toBe(false);
  });
});

describe('nextEventSlugCandidate', () => {
  it('appends a numeric suffix from the second attempt', () => {
    expect(nextEventSlugCandidate('meetup', 1)).toBe('meetup');
    expect(nextEventSlugCandidate('meetup', 2)).toBe('meetup-2');
  });
});

describe('eventPreviewPath', () => {
  it('builds an /event path', () => {
    expect(eventPreviewPath('creator-club')).toBe('/event/creator-club');
  });
});

describe('normalizeEventSlugParam', () => {
  it('decodes a catch-all slug param', () => {
    expect(normalizeEventSlugParam(['creator-club'])).toBe('creator-club');
    expect(normalizeEventSlugParam('creator-club')).toBe('creator-club');
    expect(normalizeEventSlugParam(undefined)).toBe('');
  });
});
