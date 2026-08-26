export const DEFAULT_COMM_MULTIPLY_FACTOR = 2;

/** Format a stored commission string with thousand separators, preserving any suffix. */
export function formatCommissionInput(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^([\d,]+)(.*)$/);
  if (!match) return value;
  const digits = match[1].replace(/,/g, '');
  if (!digits) return value;
  return parseInt(digits, 10).toLocaleString('en-US') + match[2];
}

export function formatCommissionRange(startComm?: string, maxComm?: string): string | undefined {
  if (startComm && maxComm) {
    if (startComm !== maxComm) return `${startComm} - ${maxComm} บ.`;
    return `${maxComm} บ.`;
  }
  if (!startComm && maxComm) return `${maxComm} บ.`;
  if (startComm && !maxComm) return `${startComm} บ.`;
  return undefined;
}

export function resolveCommissionFactor(raw?: number): number {
  if (raw != null && Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_COMM_MULTIPLY_FACTOR;
}

export type CommissionDisplay = {
  startComm?: string;
  maxComm?: string;
  commission?: string;
  boosted: boolean;
  factor: number;
};

/** Affiliate table shows original commission; `boosted` only controls the promo label. */
export function getAffiliateCommissionDisplay(input: {
  startComm?: string;
  maxComm?: string;
  commission?: string;
  commMultiplyEnabled?: boolean;
  commMultiplyFactor?: number;
}): CommissionDisplay {
  return {
    startComm: input.startComm,
    maxComm: input.maxComm,
    commission: input.commission ?? formatCommissionRange(input.startComm, input.maxComm),
    boosted: Boolean(input.commMultiplyEnabled),
    factor: resolveCommissionFactor(input.commMultiplyFactor),
  };
}
