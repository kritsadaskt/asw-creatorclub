'use client';

import { FunnelChart } from '../shared/FunnelChart';
import { useAffiliateFunnelStats } from '@/modules/hooks/useAffiliateFunnelStats';

type Props = {
  creatorId: string;
  linkId: string;
};

export function AdminAffiliateLinkFunnelChart({ creatorId, linkId }: Props) {
  const { loading, error, funnelStages, registrationsNote, conversionText } = useAffiliateFunnelStats({
    linkId,
    creatorId,
  });

  const chartId = `admin-affiliate-funnel-${creatorId.replace(/[^a-zA-Z0-9_-]/g, '')}-${linkId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
      <p className="mb-3 text-sm font-medium text-foreground">Funnel (คลิก → ลงทะเบียน)</p>
      <FunnelChart
        chartId={chartId}
        stages={funnelStages}
        loading={loading}
        error={error}
        conversionText={
          conversionText != null ? `ลงทะเบียน / คลิก: ${conversionText}` : null
        }
        footerNote={registrationsNote ? `ลงทะเบียน: ${registrationsNote}` : null}
        emptyChartMessage="ยังไม่มียอดคลิกหรือลงทะเบียน"
        showStatCards
        aria-label="กราฟ Funnel Affiliate ของครีเอเตอร์"
      />
    </div>
  );
}
