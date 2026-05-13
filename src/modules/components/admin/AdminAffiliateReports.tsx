'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { AdminAffiliateReportsResponse } from '@/modules/types/adminAffiliateReports';
import { CreatorBadge } from '../ui/creator-badge';
import { cn } from '../ui/utils';
import { formatStatsSyncedAtBangkok } from '@/lib/format-stats-synced-at';

type Props = {
  data: AdminAffiliateReportsResponse | null;
  loading: boolean;
  error: string | null;
  /** When set, name column opens creator detail (e.g. admin drawer). */
  onSelectCreator?: (creatorId: string) => void | Promise<void>;
};

function TableShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white p-6 shadow-sm',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both',
        className,
      )}
    >
      <h3 className="mb-1 text-neutral-700 text-lg font-medium">{title}</h3>
      {description ? <p className="mb-4 text-sm text-muted-foreground">{description}</p> : <div className="mb-4" />}
      {children}
    </div>
  );
}

export function AdminAffiliateReports({ data, loading, error, onSelectCreator }: Props) {
  if (loading) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-white p-6 shadow-sm flex items-center justify-center gap-2 min-h-[200px] text-muted-foreground"
          >
            <Loader2 className="h-6 w-6 animate-spin shrink-0" />
            <span>กำลังโหลดรายงาน Affiliate…</span>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { topCreators, topProjects, shlinkConfigured, statsSyncedAt } = data;
  const syncedLabel = formatStatsSyncedAtBangkok(statsSyncedAt ?? null);
  const showClicksColumn =
    shlinkConfigured || (typeof statsSyncedAt === 'string' && statsSyncedAt.length > 0);

  return (
    <div className="space-y-4">
      {!shlinkConfigured && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
          ยังไม่ได้ตั้งค่า Shlink API — คอลัมน์ยอดคลิกรวมจะไม่แสดงตัวเลข
        </p>
      )}
      {syncedLabel && (
        <p className="text-xs text-muted-foreground">
          ข้อมูลยอดคลิกอ้างอิงจาก Shlink ที่ sync ล่าสุด: {syncedLabel} (เวลาไทย)
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableShell
          title="10 อันดับครีเอเตอร์"
          description={
            onSelectCreator
              ? 'เรียงตามจำนวนลิงก์ที่สร้าง (มากสุดก่อน) พร้อมยอดคลิกรวม — คลิกชื่อเพื่อดูรายละเอียด'
              : 'เรียงตามจำนวนลิงก์ที่สร้าง (มากสุดก่อน) พร้อมยอดคลิกรวม'
          }
        >
          {topCreators.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีข้อมูลลิงก์</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium w-10">#</th>
                    <th className="py-2 pr-3 font-medium">ชื่อครีเอเตอร์</th>
                    <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">จำนวนลิงก์</th>
                    <th className="py-2 font-medium text-right whitespace-nowrap">คลิกรวม</th>
                  </tr>
                </thead>
                <tbody>
                  {topCreators.map((row, idx) => (
                    <tr key={row.creatorId} className="border-b border-border/80">
                      <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2.5 pr-3 text-foreground align-top">
                        <div className="inline-flex flex-wrap items-center gap-1.5">
                          {onSelectCreator ? (
                            <button
                              type="button"
                              className="text-left text-primary hover:underline underline-offset-2 cursor-pointer max-w-full break-words"
                              onClick={() => void onSelectCreator(row.creatorId)}
                              aria-label={`ดูรายละเอียด ${row.displayName}`}
                            >
                              {row.displayName}
                            </button>
                          ) : (
                            <span className="break-words">{row.displayName}</span>
                          )}
                          <CreatorBadge type={row.inviteType} />
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {row.linkCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        {showClicksColumn
                          ? (row.totalClicks ?? 0).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableShell>

        <TableShell
          title="10 อันดับโครงการ"
          description="เรียงตามจำนวนลิงก์รวม พร้อมจำนวนครีเอเตอร์ที่ไม่ซ้ำที่เคยสร้างลิงก์โครงการนั้น"
          className="[animation-delay:150ms]"
        >
          {topProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีข้อมูลลิงก์ตามโครงการ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium w-10">#</th>
                    <th className="py-2 pr-3 font-medium">โครงการ</th>
                    <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">จำนวนลิงก์</th>
                    <th className="py-2 font-medium text-right whitespace-nowrap">จำนวนครีเอเตอร์</th>
                  </tr>
                </thead>
                <tbody>
                  {topProjects.map((row, idx) => (
                    <tr key={row.projectId ?? `null-${idx}`} className="border-b border-border/80">
                      <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2.5 pr-3 text-foreground">{row.projectName}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {row.linkCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums">
                        {row.creatorCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableShell>
      </div>
    </div>
  );
}
