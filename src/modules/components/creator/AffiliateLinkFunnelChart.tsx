'use client';

import { FunnelChart } from '../shared/FunnelChart';
import { formatStatsSyncedAtBangkok } from '@/lib/format-stats-synced-at';
import { useAffiliateFunnelStats } from '@/modules/hooks/useAffiliateFunnelStats';

type Props = {
  linkId: string;
};

export function AffiliateLinkFunnelChart({ linkId }: Props) {
  const {
    loading,
    error,
    funnelStages,
    statsSyncedAt,
    registrationsNote,
    conversionText,
    clicksValue,
    registrationsValue,
  } = useAffiliateFunnelStats({ linkId });

  const chartId = `affiliate-funnel-${linkId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div className="w-full rounded-lg border border-border bg-muted/20 p-3 md:p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">สถิติ Affiliate Link</p>

      {formatStatsSyncedAtBangkok(statsSyncedAt) && (
        <p className="text-xs text-muted-foreground">
          ข้อมูลล่าสุดเมื่อ {formatStatsSyncedAtBangkok(statsSyncedAt)}
        </p>
      )}

      <div className="rounded-lg border border-border bg-white px-4 py-5 shadow-sm">
        <FunnelChart
          chartId={chartId}
          stages={funnelStages}
          loading={loading}
          error={error}
          conversionText={
            conversionText != null ? `ลงทะเบียน / คลิก: ${conversionText}` : null
          }
          footerNote={registrationsNote ? `ลงทะเบียน: ${registrationsNote}` : null}
          emptyChartMessage="ยังไม่มียอดคลิกหรือลงทะเบียน — กราฟจะแสดงเมื่อมีข้อมูล"
          aria-label="กราฟ Funnel คลิกและลงทะเบียน"
        />
      </div>

      {!loading && !error && clicksValue === 0 && registrationsValue === 0 && (
        <p className="text-xs text-muted-foreground">ยังไม่มียอดคลิกสำหรับลิงก์นี้</p>
      )}
    </div>
  );
}
