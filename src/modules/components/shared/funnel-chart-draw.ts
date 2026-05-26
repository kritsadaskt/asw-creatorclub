/** Vertical dividers between funnel stages (funnel-graph-js has no built-in segment separators). */
export function addFunnelSegmentDividers(
  containerId: string,
  stageCount: number,
  graphWidth: number,
  graphHeight: number,
) {
  const svg = document.querySelector<SVGSVGElement>(`#${containerId} svg`);
  if (!svg || stageCount < 2) return;

  svg.querySelectorAll('[data-funnel-chart-divider]').forEach((node) => node.remove());

  for (let i = 1; i < stageCount; i++) {
    const x = Math.round((graphWidth * i) / stageCount);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('data-funnel-chart-divider', 'true');
    line.setAttribute('x1', String(x));
    line.setAttribute('x2', String(x));
    line.setAttribute('y1', '0');
    line.setAttribute('y2', String(graphHeight));
    line.setAttribute('stroke', 'rgba(255, 255, 255, 0.92)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }
}

export const FUNNEL_CHART_HEIGHT = 160;
export const FUNNEL_CHART_MIN_WIDTH = 280;

export function funnelStageNumericValue(stage: { value: number | null; available?: boolean }): number {
  if (stage.available === false) return 0;
  if (stage.value == null || !Number.isFinite(stage.value)) return 0;
  return stage.value;
}

export function hasDrawableFunnelStages(stages: { value: number | null; available?: boolean }[]): boolean {
  return stages.some((s) => funnelStageNumericValue(s) > 0);
}

export function formatFunnelStageValue(stage: { value: number | null; available?: boolean }): string {
  if (stage.available === false) return '—';
  if (stage.value == null) return '—';
  return stage.value.toLocaleString('th-TH');
}

export function funnelConversionLabel(from: number, to: number): string | null {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to)) return null;
  const pct = (to / from) * 100;
  return `${pct.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;
}
