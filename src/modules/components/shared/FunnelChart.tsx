'use client';

/* main.min.css: layout. theme.min.css omitted (Google Fonts @import breaks PostCSS). See funnel-graph-theme.css */
import 'funnel-graph-js/dist/css/main.min.css';
import '@/styles/funnel-graph-theme.css';
import FunnelGraph from 'funnel-graph-js';
import { useLayoutEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';
import type { FunnelChartProps } from '@/modules/types/funnelChart';
import {
  addFunnelSegmentDividers,
  FUNNEL_CHART_HEIGHT,
  FUNNEL_CHART_MIN_WIDTH,
  formatFunnelStageValue,
  hasDrawableFunnelStages,
  funnelStageNumericValue,
} from './funnel-chart-draw';

const DEFAULT_COLORS = ['#22C55E', '#F97316', '#3B82F6', '#A855F7'];

export function FunnelChart({
  chartId,
  stages,
  colors = DEFAULT_COLORS,
  direction = 'horizontal',
  loading = false,
  error = null,
  emptyChartMessage = 'ยังไม่มีข้อมูล — กราฟจะแสดงเมื่อมียอด',
  conversionText = null,
  footerNote = null,
  className,
  showStatCards = true,
  'aria-label': ariaLabel = 'กราฟ Funnel',
}: FunnelChartProps) {
  const funnelElRef = useRef<HTMLDivElement | null>(null);
  const sanitizedChartId = chartId.replace(/[^a-zA-Z0-9_-]/g, '');
  const canDraw = hasDrawableFunnelStages(stages);

  useLayoutEffect(() => {
    if (loading || error || stages.length === 0 || !canDraw) return;

    const labels = stages.map((s) => s.label);
    const values = stages.map((s) => funnelStageNumericValue(s));
    const stageColors = colors.slice(0, stages.length);

    let cancelled = false;
    let lastDrawnWidth = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const draw = (width: number) => {
      const el = funnelElRef.current;
      if (cancelled || !el || !el.isConnected) return;

      try {
        el.innerHTML = '';

        const funnel = new FunnelGraph({
          container: `#${sanitizedChartId}`,
          width,
          height: FUNNEL_CHART_HEIGHT,
          direction,
          gradientDirection: direction,
          displayPercent: false,
          data: {
            labels,
            colors: stageColors.length >= stages.length ? stageColors : DEFAULT_COLORS,
            values,
          },
        });
        funnel.draw();
        if (direction === 'horizontal') {
          addFunnelSegmentDividers(sanitizedChartId, stages.length, width, FUNNEL_CHART_HEIGHT);
        }
        lastDrawnWidth = width;
      } catch (e) {
        console.error('FunnelChart draw error:', e);
      }
    };

    const resolveWidth = () => {
      const el = funnelElRef.current;
      if (!el) return 0;
      return Math.max(el.clientWidth, FUNNEL_CHART_MIN_WIDTH);
    };

    const scheduleDraw = () => {
      const width = resolveWidth();
      if (width <= 0) return;
      if (lastDrawnWidth > 0 && Math.abs(width - lastDrawnWidth) < 2) return;
      draw(width);
    };

    scheduleDraw();

    const el = funnelElRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (cancelled) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        if (cancelled) return;
        scheduleDraw();
      }, 150);
    });
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      const cleanupEl = funnelElRef.current;
      if (cleanupEl) cleanupEl.innerHTML = '';
      lastDrawnWidth = 0;
    };
  }, [sanitizedChartId, loading, error, stages, canDraw, direction, colors]);

  if (loading) {
    return (
      <div className={cn('h-40 flex items-center justify-center text-muted-foreground', className)}>
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        กำลังโหลด...
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('h-40 flex items-center justify-center text-sm text-destructive', className)}>
        {error}
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className={cn('h-40 flex items-center justify-center text-sm text-muted-foreground', className)}>
        ยังไม่มีข้อมูล
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)} role="img" aria-label={ariaLabel}>
      <div className="mx-auto w-full max-w-2xl">
        {canDraw ? (
          <div ref={funnelElRef} id={sanitizedChartId} className="funnel-chart__mount" />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
            {emptyChartMessage}
          </div>
        )}
      </div>

      {conversionText != null && (
        <p className="text-center text-xs text-muted-foreground">
          อัตราแปลง: <span className="font-semibold text-primary">{conversionText}</span>
        </p>
      )}

      {footerNote && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
          {footerNote}
        </p>
      )}
    </div>
  );
}
