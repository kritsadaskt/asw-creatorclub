export type FunnelChartStage = {
  label: string;
  value: number | null;
  /** When false, value displays as "—" and may be treated as 0 for drawing. */
  available?: boolean;
};

export type FunnelChartProps = {
  /** Unique id for the chart mount node (must be unique per page). */
  chartId: string;
  stages: FunnelChartStage[];
  colors?: string[];
  direction?: 'horizontal' | 'vertical';
  loading?: boolean;
  error?: string | null;
  /** Shown when all stage values are zero or unavailable. */
  emptyChartMessage?: string;
  /** Pre-formatted conversion text (e.g. "12.5%"). */
  conversionText?: string | null;
  /** Amber info box below the chart. */
  footerNote?: string | null;
  className?: string;
  showStatCards?: boolean;
  'aria-label'?: string;
};
