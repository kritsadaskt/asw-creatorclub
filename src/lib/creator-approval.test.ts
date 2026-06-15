import { describe, expect, it } from 'vitest';
import {
  creatorApprovalBlockMessage,
  isCreatorApproved,
  isCreatorLoginAllowed,
  parseCreatorApprovalStatus,
} from './creator-approval';

describe('creator-approval', () => {
  describe('isCreatorLoginAllowed', () => {
    it.each([
      [0, false],
      [1, true],
      [2, false],
      [3, false],
    ] as const)('status %i → %s', (status, expected) => {
      expect(isCreatorLoginAllowed(status)).toBe(expected);
    });
  });

  describe('isCreatorApproved', () => {
    it.each([
      [0, false],
      [1, true],
      [2, false],
      [3, false],
    ] as const)('status %i → %s', (status, expected) => {
      expect(isCreatorApproved(status)).toBe(expected);
    });
  });

  describe('creatorApprovalBlockMessage', () => {
    it('returns rejection message for status 0', () => {
      expect(creatorApprovalBlockMessage(0)).toContain('ปฏิเสธ');
    });

    it('returns inactive message for status 2', () => {
      expect(creatorApprovalBlockMessage(2)).toContain('ไม่สามารถเข้าสู่ระบบได้');
    });

    it('returns pending message for status 3', () => {
      expect(creatorApprovalBlockMessage(3)).toContain('ไม่สามารถเข้าสู่ระบบได้');
    });
  });

  describe('parseCreatorApprovalStatus', () => {
    it.each([0, 1, 2, 3])('parses valid status %i', (status) => {
      expect(parseCreatorApprovalStatus(status)).toBe(status);
    });

    it.each([null, undefined, '1', 4, -1])('returns null for invalid %s', (raw) => {
      expect(parseCreatorApprovalStatus(raw)).toBeNull();
    });
  });
});
