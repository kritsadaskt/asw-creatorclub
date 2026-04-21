'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
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
  categories: { label: 'หมวดหมู่', color: 'var(--primary)' },
} satisfies ChartConfig;

const CATEGORY_BAR_COLORS = [
  'hsl(217 91% 60%)',
  'hsl(262 83% 58%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(0 84% 60%)',
  'hsl(188 94% 42%)',
  'hsl(330 81% 60%)',
  'hsl(24 95% 53%)',
  'hsl(271 91% 65%)',
  'hsl(173 80% 40%)',
];

const lineChartConfig = {
  registrations: {
    label: 'สมัครใหม่',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

const creatorTypeChartConfig = {
  value: { label: 'จำนวน' },
  staff: { label: 'พนักงาน', color: 'hsl(217 91% 60%)' },
  household: { label: 'ลูกบ้าน', color: 'hsl(142 71% 45%)' },
  general: { label: 'บุคคลทั่วไป', color: 'hsl(262 83% 58%)' },
} satisfies ChartConfig;

const baseLocationChartConfig = {
  count: { label: 'จำนวน' },
} satisfies ChartConfig;

function filterListedCreators(creators: CreatorProfile[]) {
  return creators.filter((c) => !c.email.toLowerCase().includes('@creatorclub.com'));
}

function categoryLabelEnglishOnly(raw: string): string {
  const text = raw.trim();
  if (!text) return 'ไม่ระบุหมวดหมู่';

  // Keep only the left-side (typically English) when category contains bilingual separators.
  const left = text.split(/\s*[-/|]\s*/)[0]?.trim() ?? text;
  return left || text;
}

function normalizeCreatorType(typeRaw: string | undefined): 'staff' | 'household' | 'general' {
  const type = (typeRaw ?? '').trim().toLowerCase();
  if (type === 'assetwise_staff' || type === 'staff') return 'staff';
  if (type === 'household' || type === 'asw_household') return 'household';
  return 'general';
}

export function AdminDashboardCharts({ creators, loading }: Props) {
  const listed = useMemo(() => filterListedCreators(creators), [creators]);
  const approvedListed = useMemo(
    () => listed.filter((creator) => creator.approvalStatus === 1),
    [listed],
  );

  const approvalStats = useMemo(() => {
    const pending = listed.filter((c) => c.approvalStatus === 3).length;
    const approved = listed.filter((c) => c.approvalStatus === 1).length;
    const rejected = listed.filter((c) => c.approvalStatus === 0).length;
    return { all: listed.length, pending, approved, rejected };
  }, [approvedListed]);

  const categoryBarData = useMemo(() => {
    const categoryCount = new Map<string, number>();
    for (const creator of approvedListed) {
      const categories = creator.categories && creator.categories.length > 0
        ? creator.categories
        : ['ไม่ระบุหมวดหมู่'];
      for (const category of categories) {
        const normalized = categoryLabelEnglishOnly(category);
        categoryCount.set(normalized, (categoryCount.get(normalized) ?? 0) + 1);
      }
    }
    return [...categoryCount.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [approvedListed]);

  const lineData = useMemo(() => {
    const today = startOfDay(new Date());
    const start = startOfDay(subDays(today, 6));
    const days = eachDayOfInterval({ start, end: today });
    const range = { start, end: today };

    const counts = new Map<string, number>();
    for (const d of days) {
      counts.set(format(d, 'yyyy-MM-dd'), 0);
    }

    for (const c of approvedListed) {
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
  }, [approvedListed]);

  const creatorTypePieData = useMemo(() => {
    const agg = { staff: 0, household: 0, general: 0 };
    for (const creator of approvedListed) {
      const key = normalizeCreatorType(creator.type);
      agg[key] += 1;
    }
    return [
      { key: 'staff', name: 'พนักงาน', value: agg.staff, fill: creatorTypeChartConfig.staff.color },
      { key: 'household', name: 'ลูกบ้าน', value: agg.household, fill: creatorTypeChartConfig.household.color },
      { key: 'general', name: 'บุคคลทั่วไป', value: agg.general, fill: creatorTypeChartConfig.general.color },
    ];
  }, [approvedListed]);

  const baseLocationData = useMemo(() => {
    const baseLocationCount = new Map<string, number>();
    for (const creator of approvedListed) {
      const key = (creator.baseLocation ?? '').trim() || 'ไม่ระบุพื้นที่';
      baseLocationCount.set(key, (baseLocationCount.get(key) ?? 0) + 1);
    }
    return [...baseLocationCount.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [approvedListed]);

  const skeleton = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mb-3 h-4 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
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
    </div>
  );

  const statCards = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[
        { label: 'ทั้งหมด', value: approvalStats.all },
        { label: 'รออนุมัติ', value: approvalStats.pending },
        { label: 'อนุมัติแล้ว', value: approvalStats.approved },
        { label: 'ถูกปฏิเสธ', value: approvalStats.rejected },
      ].map((item, idx) => (
        <div
          key={item.label}
          className={cn(
            'rounded-xl border border-border bg-white p-4 shadow-sm',
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both',
            idx === 1 && '[animation-delay:80ms]',
            idx === 2 && '[animation-delay:160ms]',
            idx === 3 && '[animation-delay:240ms]',
          )}
        >
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
            {item.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return skeleton;
  }

  return (
    <div className="space-y-6">
      {statCards}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div
        className={cn(
          'rounded-xl border border-border bg-white p-6 shadow-sm',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both',
        )}
      >
        <h3 className="mb-4 text-neutral-700 text-lg font-medium">
          ครีเอเตอร์แยกตามหมวดหมู่ (Top 10)
        </h3>
        <ChartContainer config={barChartConfig} className="aspect-auto h-[320px] w-full">
          <BarChart
            data={categoryBarData}
            layout="vertical"
            margin={{ top: 8, right: 40, left: 16, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="category"
              tickLine={false}
              axisLine={false}
              width={100}
              tickMargin={8}
              tick={{ fontSize: 11 }}
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
                    const row = payload?.[0]?.payload as { category?: string } | undefined;
                    return row?.category ?? '';
                  }}
                />
              }
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={700}>
              {categoryBarData.map((row, idx) => (
                <Cell
                  key={row.category}
                  fill={CATEGORY_BAR_COLORS[idx % CATEGORY_BAR_COLORS.length]}
                />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                fill="var(--foreground)"
                fontSize={12}
                formatter={(value: number) => value.toLocaleString()}
              />
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

      <div
        className={cn(
          'rounded-xl border border-border bg-white p-6 shadow-sm',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:220ms]',
        )}
      >
        <h3 className="mb-4 text-neutral-700 text-lg font-medium">
          สัดส่วนประเภทครีเอเตอร์
        </h3>
        <ChartContainer config={creatorTypeChartConfig} className="aspect-auto h-[320px] w-full">
          <PieChart accessibilityLayer>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono tabular-nums">
                      {Number(value).toLocaleString()}
                    </span>
                  )}
                />
              }
            />
            <Pie
              data={creatorTypePieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, value }) => `${name}: ${Number(value).toLocaleString()}`}
              labelLine={false}
            >
              {creatorTypePieData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>

      <div
        className={cn(
          'rounded-xl border border-border bg-white p-6 shadow-sm',
          'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both [animation-delay:290ms]',
        )}
      >
        <h3 className="mb-4 text-neutral-700 text-lg font-medium">
          จำนวนครีเอเตอร์ตามพื้นที่
        </h3>
        <ChartContainer config={baseLocationChartConfig} className="aspect-auto h-[320px] w-full">
          <BarChart
            data={baseLocationData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 16, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="location"
              tickLine={false}
              axisLine={false}
              width={110}
              tickMargin={8}
              tick={{ fontSize: 11 }}
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
                />
              }
            />
            <Bar
              dataKey="count"
              fill="hsl(188 94% 42%)"
              radius={[0, 6, 6, 0]}
              animationDuration={700}
            >
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                fill="var(--foreground)"
                fontSize={12}
                formatter={(value: number) => value.toLocaleString()}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
    </div>
  );
}
