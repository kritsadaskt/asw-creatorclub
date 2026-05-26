'use client';

import { useEffect, useMemo, useState } from 'react';
import { BASE_PATH } from '@/lib/publicPath';
import type { AffiliateFunnelStatsResponse, AffiliateFunnelStage } from '@/modules/types/affiliateFunnel';
import type { FunnelChartStage } from '@/modules/types/funnelChart';
import { funnelConversionLabel, funnelStageNumericValue } from '@/modules/components/shared/funnel-chart-draw';

const DEFAULT_STAGE_KEYS = ['clicks', 'registrations'] as const;

type Options = {
  linkId: string;
  creatorId?: string;
  stageKeys?: readonly string[];
};

export function useAffiliateFunnelStats({
  linkId,
  creatorId,
  stageKeys = DEFAULT_STAGE_KEYS,
}: Options) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<AffiliateFunnelStage[]>([]);
  const [statsSyncedAt, setStatsSyncedAt] = useState<string | null>(null);
  const [registrationsNote, setRegistrationsNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!linkId) return;
      try {
        setLoading(true);
        setError(null);
        const url = creatorId
          ? `${BASE_PATH}/api/admin/creators/${encodeURIComponent(creatorId)}/affiliate-funnel-stats?linkId=${encodeURIComponent(linkId)}`
          : `${BASE_PATH}/api/affiliate/funnel-stats?linkId=${encodeURIComponent(linkId)}`;

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          setError('ไม่สามารถโหลดสถิติ Funnel ได้');
          return;
        }
        const data = (await res.json()) as AffiliateFunnelStatsResponse;
        if (cancelled) return;
        const filtered = (Array.isArray(data.stages) ? data.stages : []).filter((s) =>
          stageKeys.includes(s.key),
        );
        setStages(filtered);
        setStatsSyncedAt(typeof data.statsSyncedAt === 'string' ? data.statsSyncedAt : null);
        setRegistrationsNote(
          typeof data.registrationsUnavailableReason === 'string'
            ? data.registrationsUnavailableReason
            : null,
        );
      } catch (e) {
        console.error('Error loading affiliate funnel:', e);
        if (!cancelled) setError('ไม่สามารถโหลดสถิติ Funnel ได้');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [linkId, creatorId, stageKeys.join(',')]);

  const funnelStages: FunnelChartStage[] = useMemo(
    () =>
      stages.map((s) => ({
        label: s.label,
        value: s.value,
        available: s.available,
      })),
    [stages],
  );

  const clicksValue = useMemo(() => {
    const clicks = stages.find((s) => s.key === 'clicks');
    return funnelStageNumericValue({
      value: clicks?.value ?? null,
      available: clicks?.available ?? true,
    });
  }, [stages]);

  const registrationsValue = useMemo(() => {
    const regs = stages.find((s) => s.key === 'registrations');
    return funnelStageNumericValue({
      value: regs?.value ?? null,
      available: regs?.available ?? true,
    });
  }, [stages]);

  const conversionText = useMemo(() => {
    const regs = stages.find((s) => s.key === 'registrations');
    if (!regs?.available || regs.value == null) return null;
    return funnelConversionLabel(clicksValue, regs.value);
  }, [clicksValue, stages]);

  return {
    loading,
    error,
    funnelStages,
    statsSyncedAt,
    registrationsNote,
    conversionText,
    clicksValue,
    registrationsValue,
  };
}
