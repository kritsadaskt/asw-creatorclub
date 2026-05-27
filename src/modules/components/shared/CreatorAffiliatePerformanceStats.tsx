'use client';

import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  ClipboardList,
  Handshake,
  Link2,
  Loader2,
  MousePointerClick,
} from 'lucide-react';
import { BASE_PATH } from '@/lib/publicPath';
import { formatStatsSyncedAtBangkok } from '@/lib/format-stats-synced-at';
import {
  affiliateFunnelStageHasNoData,
  formatAffiliateFunnelStageValue,
} from '@/lib/affiliate-funnel-format';
import type { CreatorAffiliatePerformance } from '@/lib/creator-affiliate-performance';
import { cn } from '../ui/utils';

type Props = {
  creatorId: string;
  /** Admin drawer vs creator profile */
  audience: 'admin' | 'creator';
  title?: string;
  showSyncedAt?: boolean;
  className?: string;
};

export function CreatorAffiliatePerformanceStats({
  creatorId,
  audience,
  title = 'Performance Affiliate',
  showSyncedAt = true,
  className,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState<CreatorAffiliatePerformance | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!creatorId) return;
      try {
        setLoading(true);
        const url =
          audience === 'admin'
            ? `${BASE_PATH}/api/admin/creators/${encodeURIComponent(creatorId)}/affiliate-performance`
            : `${BASE_PATH}/api/affiliate/profile-performance`;

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          if (!cancelled) setPerformance(null);
          return;
        }

        const data = (await res.json()) as CreatorAffiliatePerformance;
        if (!cancelled) setPerformance(data);
      } catch (error) {
        console.error('Error loading creator affiliate performance:', error);
        if (!cancelled) setPerformance(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [creatorId, audience]);

  const formatStatValue = (
    value: number | null,
    available: boolean,
    key?: 'bookings' | 'transfers',
  ) =>
    formatAffiliateFunnelStageValue({
      key,
      value,
      available,
    });

  const statNoData = (value: number | null, available: boolean) =>
    affiliateFunnelStageHasNoData({ value, available });

  const syncedLabel =
    showSyncedAt && performance?.statsSyncedAt
      ? formatStatsSyncedAtBangkok(performance.statsSyncedAt)
      : null;

  const stats = performance
    ? ([
        {
          key: 'links',
          label: 'Link ทั้งหมด',
          icon: Link2,
          value: performance.totalLinks,
          available: true,
        },
        {
          key: 'clicks',
          label: 'คลิกทั้งหมด',
          icon: MousePointerClick,
          value: performance.totalClicks,
          available: true,
        },
        {
          key: 'registrations',
          label: 'ลงทะเบียน',
          icon: ClipboardList,
          value: performance.registrations,
          available: performance.registrations !== null,
        },
        {
          key: 'bookings',
          label: 'จอง',
          icon: CalendarCheck,
          value: performance.bookings,
          available: true,
        },
        {
          key: 'transfers',
          label: 'โอน',
          icon: Handshake,
          value: performance.transfers,
          available: true,
        },
      ] as const)
    : [];

  return (
    <div className={cn('space-y-3', className)}>
      <p className="font-medium text-muted-foreground">{title}</p>

      {syncedLabel && (
        <p className="text-xs text-muted-foreground">
          {audience === 'admin' ? 'ข้อมูลคลิก sync ล่าสุด' : 'ตัวเลขคลิก sync ล่าสุด'}: {syncedLabel}{' '}
          (เวลาไทย)
        </p>
      )}

      {loading ? (
        <div className="flex h-20 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          กำลังโหลด...
        </div>
      ) : !performance ? (
        <p className="text-sm text-muted-foreground">ไม่สามารถโหลดสถิติ Performance ได้</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const noData = statNoData(stat.value, stat.available);
            return (
              <div
                key={stat.key}
                className={cn(
                  'rounded-xl border border-border p-4 shadow-sm',
                  noData ? 'bg-neutral-100' : 'bg-white',
                )}
              >
                <div
                  className={cn(
                    'mb-2 flex items-center gap-2',
                    noData ? 'text-neutral-500' : 'text-muted-foreground',
                  )}
                >
                  <Icon className={cn('h-4 w-4', noData ? 'text-neutral-400' : 'text-primary')} />
                  <span className="text-xs">{stat.label}</span>
                </div>
                <p
                  className={cn(
                    'text-2xl font-semibold tabular-nums',
                    noData ? 'text-neutral-400' : 'text-foreground',
                  )}
                >
                  {formatStatValue(
                    stat.value,
                    stat.available,
                    stat.key === 'bookings' || stat.key === 'transfers' ? stat.key : undefined,
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
