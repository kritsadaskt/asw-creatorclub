'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BASE_PATH } from '@/lib/publicPath';
import type { AdminAffiliateSubmittedPostLinkRow } from '@/modules/types/adminAffiliateReports';
import { exportSubmittedAffiliatePostsToCsv } from '@/modules/utils/exportSubmittedAffiliatePosts';
import { Button } from '../shared/Button';
import { AdminAffiliateSubmittedPostsTable } from './AdminAffiliateSubmittedPostsTable';

export function AdminAffiliatePostsPage() {
  const [rows, setRows] = useState<AdminAffiliateSubmittedPostLinkRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${BASE_PATH}/api/admin/affiliate-reports`, { credentials: 'same-origin' });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          linksWithSubmittedPosts?: number;
          submittedPostAffiliateLinks?: unknown[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setRows([]);
          setTotal(0);
          setError(json.error ?? 'ไม่สามารถโหลดข้อมูลได้');
          return;
        }
        const parsed: AdminAffiliateSubmittedPostLinkRow[] = Array.isArray(json.submittedPostAffiliateLinks)
          ? json.submittedPostAffiliateLinks.map((row) => ({
              linkId: typeof (row as { linkId?: string }).linkId === 'string' ? (row as { linkId: string }).linkId : '',
              creatorId:
                typeof (row as { creatorId?: string }).creatorId === 'string'
                  ? (row as { creatorId: string }).creatorId
                  : '',
              displayName:
                typeof (row as { displayName?: string }).displayName === 'string'
                  ? (row as { displayName: string }).displayName
                  : '—',
              inviteType:
                typeof (row as { inviteType?: string }).inviteType === 'string'
                  ? (row as { inviteType: string }).inviteType
                  : '',
              campaignName:
                typeof (row as { campaignName?: string }).campaignName === 'string'
                  ? (row as { campaignName: string }).campaignName
                  : '—',
              affiliateUrl:
                typeof (row as { affiliateUrl?: string }).affiliateUrl === 'string'
                  ? (row as { affiliateUrl: string }).affiliateUrl
                  : '',
              postLinks: Array.isArray((row as { postLinks?: unknown }).postLinks)
                ? (row as { postLinks: unknown[] }).postLinks.filter((u): u is string => typeof u === 'string')
                : [],
              projectName:
                typeof (row as { projectName?: string }).projectName === 'string'
                  ? (row as { projectName: string }).projectName
                  : '—',
              createdAt:
                typeof (row as { createdAt?: string }).createdAt === 'string'
                  ? (row as { createdAt: string }).createdAt
                  : '',
            }))
          : [];
        setRows(parsed);
        setTotal(typeof json.linksWithSubmittedPosts === 'number' ? json.linksWithSubmittedPosts : parsed.length);
      } catch {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          setError('ไม่สามารถโหลดข้อมูลได้');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExportCsv = () => {
    if (rows.length === 0) {
      toast.info('ยังไม่มีข้อมูลให้ส่งออก');
      return;
    }
    try {
      exportSubmittedAffiliatePostsToCsv(rows);
      toast.success('ส่งออก CSV เรียบร้อยแล้ว');
    } catch (err) {
      console.error('export submitted posts csv', err);
      toast.error('ไม่สามารถส่งออก CSV ได้');
    }
  };

  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">ลิงก์โพสต์จากครีเอเตอร์</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ลิงก์ Affiliate ที่ครีเอเตอกรอกลิงก์โพสต์กลับเข้าระบบแล้ว เรียงจากล่าสุดก่อน
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="success"
            onClick={handleExportCsv}
            disabled={loading || rows.length === 0}
            className="gap-2"
            center
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Link
            href="/admin/dashboard"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
          >
            กลับแดชบอร์ด
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 shrink-0 animate-spin" aria-hidden />
          <span>กำลังโหลด…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-foreground">{total.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">รายการ</span>
          </div>
          <AdminAffiliateSubmittedPostsTable rows={rows} variant="full" />
        </div>
      )}
    </div>
  );
}
