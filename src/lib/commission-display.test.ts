import { describe, expect, it } from 'vitest';
import {
  formatCommissionInput,
  formatCommissionRange,
  getAffiliateCommissionDisplay,
} from './commission-display';

describe('commission-display', () => {
  describe('formatCommissionRange', () => {
    it('formats a range and a single value', () => {
      expect(formatCommissionRange('5,000', '10,000')).toBe('5,000 - 10,000 บ.');
      expect(formatCommissionRange('5,000', '5,000')).toBe('5,000 บ.');
      expect(formatCommissionRange('5,000')).toBe('5,000 บ.');
    });
  });

  describe('formatCommissionInput', () => {
    it('inserts thousand separators', () => {
      expect(formatCommissionInput('5000')).toBe('5,000');
    });
  });

  describe('getAffiliateCommissionDisplay', () => {
    it('keeps original table values and only flags the promo label', () => {
      const display = getAffiliateCommissionDisplay({
        startComm: '5,000',
        maxComm: '10,000',
        commMultiplyEnabled: true,
        commMultiplyFactor: 2,
      });
      expect(display.boosted).toBe(true);
      expect(display.factor).toBe(2);
      expect(display.startComm).toBe('5,000');
      expect(display.maxComm).toBe('10,000');
      expect(display.commission).toBe('5,000 - 10,000 บ.');
    });

    it('does not show the label when multiplier is off', () => {
      const display = getAffiliateCommissionDisplay({
        startComm: '5,000',
        commMultiplyEnabled: false,
      });
      expect(display.boosted).toBe(false);
      expect(display.startComm).toBe('5,000');
    });
  });
});
