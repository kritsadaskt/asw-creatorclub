'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { th } from 'date-fns/locale';
import type { CreatorProfile } from '../../types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart';
import { cn } from '../ui/utils';

type Props = {
  creators: CreatorProfile[];
  loading: boolean;
};

const barChartConfig = {
  count: { label: 'จำนวน' },
  all: { label: 'ทั้งหมด', color: 'var(--primary)' },
  pending: { label: 'รออนุมัติ', color: 'hsl(38 92% 50%)' },
  approved: { label: 'อนุมัติแล้ว', color: 'hsl(142 71% 45%)' },
  rejected: { label: 'ถูกปฏิเสธ', color: 'hsl(0 84% 60%)' },
} satisfies ChartConfig;

const lineChartConfig = {
  registrations: {
    label: 'สมัครใหม่',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

function filterListedCreators(creators: CreatorProfile[]) {
  return creators.filter((c) => !c.email.toLowerCase().includes('@creatorclub.com'));
}

export function AdminDashboardCharts({ creators, loading }: Props) {
  const listed = useMemo(() => filterListedCreators(creators), [creators]);

  const barData = useMemo(() => {
    const pending = listed.filter((c) => c.approvalStatus === 3).length;
    const approved = listed.filter((c) => c.approvalStatus === 1).length;
    const rejected = listed.filter((c) => c.approvalStatus === 0).length;
    return [
      { key: 'all' as const, label: 'ทั้งหมด', count: listed.length },
      { key: 'pending' as const, label: 'รออนุมัติ', count: pending },
      { key: 'approved' as const, label: 'อนุมัติแล้ว', count: approved },
      { key: 'rejected' as const, label: 'ถูกปฏิเสธ', count: rejected },
    ];
  }, [listed]);

  const lineData = useMemo(() => {
    const today = startOfDay(new Date());
    const start = startOfDay(subDays(today, 6));
    const days = eachDayOfInterval({ start, end: today });
    const range = { start, end: today };

    const counts = new Map<string, number>();
    for (const d of days) {
      counts.set(format(d, 'yyyy-MM-dd'), 0);
    }

    for (const c of listed) {
      try {
        const created = startOfDay(parseISO(c.createdAt));
        if (isWithinInterval(created, range)) {
          const k = format(created, 'yyyy-MM-dd');
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      } catch {
        /* skip invalid dates */
      }
    }

    return days.map((d) => {
      const k = format(d, 'yyyy-MM-dd');
      return {
        dateKey: k,
        label: format(d, 'd MMM', { locale: th }),
        registrations: counts.get(k) ?? 0,
      };
    });
  }, [listed]);

  const skeleton = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-white p-6 shadow-sm"
        >
          <div className="mb-4 h-5 w-48 animate-pulse rounded-md bg-muted" />
          <div className="flex h-[260px] items-end justify-between gap-2 px-2 pt-8">
            {[40, 65, 35, 80, 50, 70, 45].map((h, j) => (
              <div
                key={j}
                className="w-full max-w-[3rem] animate-pulse rounded-t-md bg-muted"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return skeleton;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div
        className={cn(
          'rounded-xl border border-border bg-white p-6 shadow-sm',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both',
        )}
      >
        <h3 className="mb-4 text-neutral-700 text-lg font-medium">
          จำนวนครีเอเตอร์ตามสถานะการอนุมัติ
        </h3>
        <ChartContainer config={barChartConfig} className="aspect-auto h-[260px] w-full">
          <BarChart
            data={barData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={32}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono tabular-nums">
                      {Number(value).toLocaleString()}
                    </span>
                  )}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { label?: string } | undefined;
                    return row?.label ?? '';
                  }}
                />
              }
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={700}>
              {barData.map((d) => (
                <Cell key={d.key} fill={`var(--color-${d.key})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      <div
        className={cn(
          'rounded-xl border border-border bg-white p-6 shadow-sm',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:150ms]',
        )}
      >
        <h3 className="mb-4 text-neutral-700 text-lg font-medium">
          การสมัครรายวัน (7 วันล่าสุด)
        </h3>
        <ChartContainer config={lineChartConfig} className="aspect-auto h-[260px] w-full">
          <LineChart
            data={lineData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={32}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono tabular-nums">
                      {Number(value).toLocaleString()}
                    </span>
                  )}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { label?: string } | undefined;
                    return row?.label ?? '';
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="registrations"
              stroke="var(--color-registrations)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-registrations)' }}
              activeDot={{ r: 5 }}
              animationDuration={700}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
