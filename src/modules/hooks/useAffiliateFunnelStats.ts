'use client';

import { useEffect, useMemo, useState } from 'react';
import { BASE_PATH } from '@/lib/publicPath';
import {
  affiliateFunnelConversionLabel,
  affiliateFunnelStageNumericValue,
} from '@/lib/affiliate-funnel-format';
import type { AffiliateFunnelStatsResponse, AffiliateFunnelStage } from '@/modules/types/affiliateFunnel';

const DEFAULT_STAGE_KEYS = ['clicks', 'registrations', 'bookings', 'transfers'] as const;

const STAGE_ORDER: Record<string, number> = {
  clicks: 0,
  registrations: 1,
  bookings: 2,
  transfers: 3,
};

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
          setError('ไม่สามารถโหลดสถิติได้');
          return;
        }
        const data = (await res.json()) as AffiliateFunnelStatsResponse;
        if (cancelled) return;
        const filtered = (Array.isArray(data.stages) ? data.stages : [])
          .filter((s) => stageKeys.includes(s.key))
          .sort((a, b) => (STAGE_ORDER[a.key] ?? 99) - (STAGE_ORDER[b.key] ?? 99));
        setStages(filtered);
        setStatsSyncedAt(typeof data.statsSyncedAt === 'string' ? data.statsSyncedAt : null);
        setRegistrationsNote(
          typeof data.registrationsUnavailableReason === 'string'
            ? data.registrationsUnavailableReason
            : null,
        );
      } catch (e) {
        console.error('Error loading affiliate link stats:', e);
        if (!cancelled) setError('ไม่สามารถโหลดสถิติได้');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [linkId, creatorId, stageKeys.join(',')]);

  const clicksValue = useMemo(() => {
    const clicks = stages.find((s) => s.key === 'clicks');
    return affiliateFunnelStageNumericValue({
      value: clicks?.value ?? null,
      available: clicks?.available ?? true,
    });
  }, [stages]);

  const registrationsValue = useMemo(() => {
    const regs = stages.find((s) => s.key === 'registrations');
    return affiliateFunnelStageNumericValue({
      value: regs?.value ?? null,
      available: regs?.available ?? true,
    });
  }, [stages]);

  const conversionText = useMemo(() => {
    const regs = stages.find((s) => s.key === 'registrations');
    if (!regs?.available || regs.value == null) return null;
    return affiliateFunnelConversionLabel(clicksValue, regs.value);
  }, [clicksValue, stages]);

  return {
    loading,
    error,
    stages,
    statsSyncedAt,
    registrationsNote,
    conversionText,
    clicksValue,
    registrationsValue,
  };
}
