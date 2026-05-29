'use client';

import { Loader2 } from 'lucide-react';
import { formatStatsSyncedAtBangkok } from '@/lib/format-stats-synced-at';
import {
  affiliateFunnelStageHasNoData,
  formatAffiliateFunnelStageValue,
} from '@/lib/affiliate-funnel-format';
import { useAffiliateFunnelStats } from '@/modules/hooks/useAffiliateFunnelStats';
import { cn } from '../ui/utils';

type Props = {
  linkId: string;
  creatorId?: string;
  title?: string;
  showSyncedAt?: boolean;
  className?: string;
};

export function AffiliateLinkFunnelStatsCards({
  linkId,
  creatorId,
  title = 'สถิติ Affiliate Link',
  showSyncedAt = true,
  className,
}: Props) {
  const {
    loading,
    error,
    stages,
    statsSyncedAt,
    registrationsNote,
    conversionText,
    clicksValue,
    registrationsValue,
  } = useAffiliateFunnelStats({ linkId, creatorId });

  const syncedLabel = showSyncedAt ? formatStatsSyncedAtBangkok(statsSyncedAt) : null;

  return (
    <div className={cn('py-3 space-y-3', className)}>
      <p className="text-sm font-medium text-foreground">{title}</p>

      {syncedLabel && (
        <p className="text-xs text-muted-foreground">ข้อมูลล่าสุดเมื่อ {syncedLabel}</p>
      )}

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          กำลังโหลด...
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stages.map((stage, idx) => {
              const noData = affiliateFunnelStageHasNoData(stage);
              return (
                <div
                  key={stage.key}
                  className={cn(
                    'rounded-xl border border-border p-4 shadow-sm',
                    noData ? 'bg-neutral-100' : 'bg-purple-50',
                    idx > 0 &&
                      'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both',
                    idx === 1 && '[animation-delay:80ms]',
                    idx === 2 && '[animation-delay:160ms]',
                    idx === 3 && '[animation-delay:240ms]',
                  )}
                >
                  <p
                    className={cn(
                      'text-sm',
                      noData ? 'text-neutral-500' : 'text-neutral-700',
                    )}
                  >
                    {stage.label}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-3xl font-semibold tabular-nums',
                      noData ? 'text-neutral-400' : 'text-purple-500',
                    )}
                  >
                    {formatAffiliateFunnelStageValue({
                      key: stage.key,
                      value: stage.value,
                      available: stage.available,
                    })}
                  </p>
                </div>
              );
            })}
          </div>

          {conversionText != null && (
            <p className="text-center text-xs text-muted-foreground">
              อัตราแปลง (ลงทะเบียน / คลิก):{' '}
              <span className="font-semibold text-primary">{conversionText}</span>
            </p>
          )}

          {registrationsNote && (
            <p className="rounded-md border sr-only border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ลงทะเบียน: {registrationsNote}
            </p>
          )}

          {clicksValue === 0 && registrationsValue === 0 && (
            <p className="text-xs text-muted-foreground">ยังไม่มียอดคลิกหรือลงทะเบียนสำหรับลิงก์นี้</p>
          )}
        </>
      )}
    </div>
  );
}
