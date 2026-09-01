'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { LeadTimelineEvent } from '@/lib/lead-timeline';
import { LEAD_EVENT_VISUALS } from './LeadStageBadge';

function formatThaiDate(date: string): string {
  if (!date) return '-';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

type LeadContactTimelineProps = {
  events: LeadTimelineEvent[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function LeadContactTimeline({
  events,
  loading = false,
  error = null,
  onRetry,
}: LeadContactTimelineProps) {
  return (
    <div className="space-y-3.5 rounded-xl border border-border/50 bg-neutral-50 p-4">
      <div className="flex items-center justify-between border-b border-border/70 pb-1.5">
        <h4 className="text-sm font-semibold text-neutral-700">ไทม์ไลน์การติดต่อ</h4>
        {!loading && !error && events.length > 0 ? (
          <span className="text-xs text-muted-foreground">{events.length} รายการ</span>
        ) : null}
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <span className="flex items-center gap-1.5 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            โหลดประวัติการติดต่อไม่สำเร็จ
          </span>
          <span className="text-xs text-amber-700/90">{error}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer text-xs font-medium text-amber-900 underline underline-offset-2"
            >
              ลองอีกครั้ง
            </button>
          ) : null}
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดประวัติการติดต่อ...
        </div>
      ) : events.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">ยังไม่มีประวัติการติดต่อ</p>
      ) : (
        <ol className="relative space-y-5 pl-6">
          {/* Rail runs behind the dots; last item stops it from dangling past the final event. */}
          <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-border" aria-hidden />

          {events.map((event) => {
            const visual = LEAD_EVENT_VISUALS[event.kind];

            return (
              <li key={event.id} className="relative">
                <span
                  className={`absolute top-1.5 -left-6 h-[11px] w-[11px] rounded-full ring-4 ring-neutral-50 ${visual.dotClassName}`}
                  aria-hidden
                />

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {formatThaiDate(event.date)}
                  </span>
                  {event.time ? (
                    <span className="text-xs text-muted-foreground">{event.time} น.</span>
                  ) : null}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${visual.className}`}
                  >
                    {visual.label}
                  </span>
                  {event.isOrigin ? (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      รายการนี้
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {[event.channel, event.type].filter(Boolean).join(' · ')}
                  {event.projectName ? ` · ${event.projectName}` : ''}
                </div>

                {event.note ? (
                  <p className="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                    {event.note}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
