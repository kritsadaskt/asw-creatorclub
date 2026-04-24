'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/publicPath';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type DailyPoint = {
  date: string;
  clicks: number;
};

type ClickSeriesResponse = {
  points: DailyPoint[];
  totals: {
    days3: number;
    days7: number;
    days30: number;
  };
};

type Props = {
  linkId: string;
};

type RangeDay = 3 | 7 | 30;

const RANGE_OPTIONS: RangeDay[] = [3, 7, 30];

export function AffiliateClickTrendChart({ linkId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<RangeDay>(7);
  const [points30, setPoints30] = useState<DailyPoint[]>([]);
  const [totals, setTotals] = useState<ClickSeriesResponse['totals']>({
    days3: 0,
    days7: 0,
    days30: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${BASE_PATH}/api/affiliate/shlink-click-series?linkId=${encodeURIComponent(linkId)}&days=30`, {
          credentials: 'include',
        });
        if (!res.ok) {
          setError('ไม่สามารถโหลดข้อมูลได้');
          return;
        }
        const data = (await res.json()) as ClickSeriesResponse;
        if (cancelled) return;
        setPoints30(Array.isArray(data.points) ? data.points : []);
        if (data.totals) setTotals(data.totals);
      } catch (e) {
        console.error('Error loading click trend:', e);
        if (!cancelled) setError('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [linkId]);

  const chartData = useMemo(() => {
    const source = points30.slice(-rangeDays);
    return source.map((p) => ({
      ...p,
      label: new Date(`${p.date}T00:00:00`).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
      }),
    }));
  }, [points30, rangeDays]);

  const selectedTotal =
    rangeDays === 3 ? totals.days3 : rangeDays === 7 ? totals.days7 : totals.days30;

  return (
    <div className="w-full rounded-lg border border-border bg-muted/20 p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          จำนวนคลิกย้อนหลัง{' '}
          <span className="font-semibold text-primary tabular-nums">
            {rangeDays} วัน
          </span>{' '}
          :{' '}
          <span className="font-semibold text-primary tabular-nums">
            {selectedTotal.toLocaleString('th-TH')}
          </span>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-white p-1">
          {RANGE_OPTIONS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setRangeDays(day)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                rangeDays === day ? 'bg-primary text-white' : 'text-primary hover:text-primary/80'
              }`}
            >
              {day} วัน
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-44 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          กำลังโหลดกราฟ...
        </div>
      ) : error ? (
        <div className="h-44 flex items-center justify-center text-sm text-destructive">{error}</div>
      ) : chartData.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">ยังไม่มีข้อมูลการคลิก</div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={26} />
              <Tooltip
                formatter={(value: number) => [Number(value).toLocaleString('th-TH'), 'คลิก']}
                labelFormatter={(label) => `วันที่ ${label}`}
              />
              <Bar dataKey="clicks" fill="#1c398e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
