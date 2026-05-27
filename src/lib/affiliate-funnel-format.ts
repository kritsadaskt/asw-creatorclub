export function affiliateFunnelStageNumericValue(stage: {
  value: number | null;
  available?: boolean;
}): number {
  if (stage.available === false) return 0;
  if (stage.value == null || !Number.isFinite(stage.value)) return 0;
  return stage.value;
}

/** True when the stage should use muted “no data” styling (0 count or cannot be measured). */
export function affiliateFunnelStageHasNoData(stage: {
  value: number | null;
  available?: boolean;
}): boolean {
  if (stage.available === false && stage.value == null) return true;
  return affiliateFunnelStageNumericValue(stage) === 0;
}

export function formatAffiliateFunnelStageValue(stage: {
  key?: string;
  value: number | null;
  available?: boolean;
}): string {
  if (stage.available === false && stage.value == null) {
    if (stage.key === 'bookings' || stage.key === 'transfers') return '0';
    return '—';
  }
  return affiliateFunnelStageNumericValue(stage).toLocaleString('th-TH');
}

export function affiliateFunnelConversionLabel(from: number, to: number): string | null {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to)) return null;
  const pct = (to / from) * 100;
  return `${pct.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;
}
