'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/publicPath';
import { formatStatsSyncedAtBangkok } from '@/lib/format-stats-synced-at';
import type { AffiliateFunnelStage, AffiliateFunnelStatsResponse } from '@/modules/types/affiliateFunnel';

type Props = {
  linkId: string;
};

const VISIBLE_STAGE_KEYS = ['clicks', 'registrations'] as const;

const STAGE_FILL_CLASS: Record<(typeof VISIBLE_STAGE_KEYS)[number], string> = {
  clicks: 'bg-emerald-500',
  registrations: 'bg-orange-500',
};

/** Stepped bar width (% of row) — top widest, each step narrower like classic funnel charts. */
const STEPPED_WIDTH_BY_INDEX = [100, 72];

function formatStageValue(stage: AffiliateFunnelStage): string {
  if (!stage.available) return '—';
  if (stage.value == null) return '—';
  return stage.value.toLocaleString('th-TH');
}

function conversionLabel(from: number, to: number): string | null {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to)) return null;
  const pct = (to / from) * 100;
  return `${pct.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;
}

function barWidthPercent(
  index: number,
  stage: AffiliateFunnelStage,
  clicksValue: number,
): number {
  const stepped = STEPPED_WIDTH_BY_INDEX[index] ?? 60;
  if (index === 0) return stepped;
  if (!stage.available || stage.value == null) return stepped;
  if (clicksValue > 0) {
    const ratio = Math.min(1, stage.value / clicksValue);
    return Math.max(48, Math.round(ratio * stepped));
  }
  return stepped;
}

export function AffiliateLinkFunnelChart({ linkId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<AffiliateFunnelStage[]>([]);
  const [statsSyncedAt, setStatsSyncedAt] = useState<string | null>(null);
  const [registrationsNote, setRegistrationsNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${BASE_PATH}/api/affiliate/funnel-stats?linkId=${encodeURIComponent(linkId)}`,
          { credentials: 'include' },
        );
        if (!res.ok) {
          setError('ไม่สามารถโหลดสถิติ Funnel ได้');
          return;
        }
        const data = (await res.json()) as AffiliateFunnelStatsResponse;
        if (cancelled) return;
        const filtered = (Array.isArray(data.stages) ? data.stages : []).filter((s) =>
          VISIBLE_STAGE_KEYS.includes(s.key as (typeof VISIBLE_STAGE_KEYS)[number]),
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
  }, [linkId]);

  const clicksStage = stages.find((s) => s.key === 'clicks');
  const registrationsStage = stages.find((s) => s.key === 'registrations');
  const clicksValue =
    clicksStage?.available && clicksStage.value != null ? clicksStage.value : 0;

  const registrationConversion = useMemo(() => {
    if (!registrationsStage?.available || registrationsStage.value == null) return null;
    return conversionLabel(clicksValue, registrationsStage.value);
  }, [clicksValue, registrationsStage]);

  return (
    <div className="w-full rounded-lg border border-border bg-muted/20 p-3 md:p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">สถิติ Affiliate Link</p>

      {formatStatsSyncedAtBangkok(statsSyncedAt) && (
        <p className="text-xs text-muted-foreground">
          ยอดคลิก sync ล่าสุด: {formatStatsSyncedAtBangkok(statsSyncedAt)} (เวลาไทย)
        </p>
      )}

      {loading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          กำลังโหลด...
        </div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-sm text-destructive">{error}</div>
      ) : stages.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</div>
      ) : (
        <div
          className="rounded-lg border border-border bg-white px-4 py-5 shadow-sm"
          role="img"
          aria-label="กราฟ Funnel คลิกและลงทะเบียน"
        >
          <div className="mx-auto max-w-md space-y-3">
            {stages.map((stage, index) => {
              const fillKey = stage.key as (typeof VISIBLE_STAGE_KEYS)[number];
              const widthPct = barWidthPercent(index, stage, clicksValue);

              return (
                <div
                  key={stage.key}
                  className="grid grid-cols-[minmax(5.5rem,7rem)_1fr] items-center gap-x-4 gap-y-1"
                >
                  <span className="text-right text-sm text-muted-foreground">{stage.label}</span>
                  <div className="flex justify-center py-0.5">
                    <div
                      className={`flex h-12 min-w-[7rem] items-center justify-center rounded-sm text-lg font-bold tabular-nums text-white shadow-sm transition-all ${STAGE_FILL_CLASS[fillKey] ?? 'bg-primary'} ${
                        !stage.available ? 'opacity-50' : ''
                      }`}
                      style={{ width: `${widthPct}%` }}
                    >
                      {formatStageValue(stage)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {registrationConversion != null && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              อัตราแปลงลงทะเบียน / คลิก:{' '}
              <span className="font-semibold text-primary">{registrationConversion}</span>
            </p>
          )}
        </div>
      )}

      {registrationsNote && !loading && !error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
          ลงทะเบียน: {registrationsNote}
        </p>
      )}

      {!loading && !error && clicksValue === 0 && (
        <p className="text-xs text-muted-foreground">ยังไม่มียอดคลิกสำหรับลิงก์นี้</p>
      )}
    </div>
  );
}
