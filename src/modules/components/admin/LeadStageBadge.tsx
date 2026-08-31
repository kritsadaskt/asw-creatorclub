'use client';

import React from 'react';
import type { LeadStage, LeadTimelineEventKind } from '@/lib/lead-timeline';

type StageVisual = {
  label: string;
  className: string;
  dotClassName: string;
};

/** Shared between the table badge and the drawer timeline so colours never drift apart. */
export const LEAD_EVENT_VISUALS: Record<LeadTimelineEventKind, StageVisual> = {
  register: {
    label: 'ลงทะเบียน',
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    dotClassName: 'bg-neutral-400',
  },
  outbound: {
    label: 'ติดต่อแล้ว',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClassName: 'bg-amber-500',
  },
  inbound: {
    label: 'ลูกค้าติดต่อเข้ามา',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClassName: 'bg-sky-500',
  },
  walk_in: {
    label: 'เข้าชมโครงการ',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClassName: 'bg-emerald-500',
  },
  other: {
    label: 'อื่นๆ',
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    dotClassName: 'bg-neutral-400',
  },
};

const STAGE_DESCRIPTIONS: Record<LeadStage, string> = {
  register: 'ลงทะเบียนแล้ว ยังไม่มีการติดต่อกลับ',
  outbound: 'มีการติดต่อกับลูกค้าแล้ว',
  walk_in: 'ลูกค้าเข้าชมโครงการแล้ว',
};

type LeadStageBadgeProps = {
  stage: LeadStage | null;
  loading?: boolean;
};

export function LeadStageBadge({ stage, loading = false }: LeadStageBadgeProps) {
  if (loading) {
    return (
      <span
        aria-hidden
        className="ml-2 inline-block h-[1.375rem] w-20 animate-pulse rounded-full bg-neutral-100 align-middle"
      />
    );
  }

  if (!stage) return null;

  const visual = LEAD_EVENT_VISUALS[stage];

  return (
    <span
      title={STAGE_DESCRIPTIONS[stage]}
      className={`ml-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 align-middle text-[11px] font-semibold whitespace-nowrap ${visual.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${visual.dotClassName}`} />
      {visual.label}
    </span>
  );
}
