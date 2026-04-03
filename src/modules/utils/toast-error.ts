/** Max extra length after em dash to keep toast readable. */
const DEFAULT_CAUSE_MAX = 220;

function causeString(cause: unknown, maxLen: number): string {
  let s = '';
  if (cause instanceof Error && cause.message.trim()) {
    s = cause.message.trim();
  } else if (typeof cause === 'string' && cause.trim()) {
    s = cause.trim();
  }
  if (!s) return '';
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…`;
  return s;
}

/**
 * e.g. "เกิดข้อผิดพลาด — Postgres error …" when cause is known; otherwise just `base`.
 */
export function formatGenericErrorToast(base: string, cause: unknown, maxCauseLen = DEFAULT_CAUSE_MAX): string {
  const extra = causeString(cause, maxCauseLen);
  if (!extra) return base;
  if (extra === base.trim()) return base;
  return `${base} — ${extra}`;
}
