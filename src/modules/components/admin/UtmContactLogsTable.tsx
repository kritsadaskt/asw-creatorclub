'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Search,
  FileDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  Info
} from 'lucide-react';
import { Button } from '../shared/Button';
import { getCreatorById, getProjects } from '@/modules/utils/storage';
import type { CreatorProfile } from '@/modules/types';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { LeadTypeByKey } from '../ui/utils';
import {
  decodeCisContactDetail,
  formatFgfReferrerName,
  resolveFgfReferrer,
} from '@/lib/fgf-lead-referrer';
import type { CisContactLogHistoryRow } from '@/lib/cis-contact-log-history';
import {
  buildLeadTimeline,
  earliestContactDate,
  groupHistoryByCustomer,
  resolveLeadStage,
  scopeHistoryToLead,
  shiftDateByDays,
  todayIsoDate,
  type LeadStage,
} from '@/lib/lead-timeline';
import { LEAD_EVENT_VISUALS, LeadStageBadge } from './LeadStageBadge';
import { LeadContactTimeline } from './LeadContactTimeline';

const DEFAULT_UTM_SOURCES = [
  'creator_club_affiliate',
  'creatorclub',
  'creatorclub_friend_get_friend',
] as const;

/** Field names below match the CIS GetContactLogRegister payload exactly. */
interface ContactLogItem {
  ProjectID?: number;
  ProjectCode?: string;
  ProjectName?: string;
  CustomerID?: number;
  CustomerFirstName?: string;
  CustomerLastName?: string;
  CustomerMobile?: string;
  CustomerLineID?: string;
  CustomerGrade?: string;
  ContactChannelName?: string;
  ContactType?: string;
  ContactDate?: string;
  ContactTime?: string;
  ContactDetail?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  PriceInterest?: string;
  ModelInterest?: string;
  PromoCode?: string;
  PurchasePurpose?: string;
  Ref?: string;
  [key: string]: any;
}

/** Stable across pagination — CIS does not return a ContactLogID on this endpoint. */
function contactLogRowKey(log: ContactLogItem): string {
  return [log.CustomerID, log.ProjectID, log.ContactDate, log.ContactTime, log.utm_source]
    .map((part) => String(part ?? ''))
    .join('|');
}

/** CIS prefixes mobile numbers with an apostrophe to stop Excel mangling them. */
function cleanMobile(value?: string): string {
  const trimmed = String(value ?? '').trim().replace(/^'/, '');
  return trimmed && trimmed !== 'NULL' ? trimmed : '';
}

interface UtmContactLogsTableProps {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  allowSearch?: boolean;
  /** When false, skip auto-fetch until tab becomes active. */
  enabled?: boolean;
}

export function UtmContactLogsTable({
  utmSource = '',
  utmCampaign = '',
  utmMedium = '',
  allowSearch = true,
  enabled = true,
}: UtmContactLogsTableProps) {
  const [logs, setLogs] = useState<ContactLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search parameters
  const [searchSource, setSearchSource] = useState(utmSource);
  const [searchCampaign, setSearchCampaign] = useState(utmCampaign);
  const [searchMedium, setSearchMedium] = useState(utmMedium);

  // Project map for friendly names
  const [projectMap, setProjectMap] = useState<Record<number, string>>({});

  // Selected log for detailed view drawer
  const [selectedLog, setSelectedLog] = useState<ContactLogItem | null>(null);
  const [isRawJsonOpen, setIsRawJsonOpen] = useState(false);
  const [referrerCreator, setReferrerCreator] = useState<CreatorProfile | null>(null);
  const [referrerCreatorLoading, setReferrerCreatorLoading] = useState(false);
  const [referrerCreatorNotFound, setReferrerCreatorNotFound] = useState(false);

  // CIS contact history — loaded after the table renders so leads are never blocked on it.
  const [historyByCustomer, setHistoryByCustomer] = useState<Map<number, CisContactLogHistoryRow[]>>(
    () => new Map(),
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load project map on mount
  useEffect(() => {
    async function loadProjects() {
      try {
        const projectsList = await getProjects();
        const mapping: Record<number, string> = {};
        projectsList.forEach((p) => {
          if (p.cisId != null) {
            mapping[p.cisId] = p.name;
          }
        });
        setProjectMap(mapping);
      } catch (err) {
        console.error('Failed to load projects map:', err);
      }
    }
    loadProjects();
  }, []);

  // Fetch logs function
  const fetchLogs = async (
    sourceValue = searchSource,
    campaignValue = searchCampaign,
    mediumValue = searchMedium,
    options?: { signal?: AbortSignal },
  ) => {
    const trimmedSource = sourceValue.trim();
    const isStale = () => options?.signal?.aborted ?? false;

    setLoading(true);
    setError(null);
    setCurrentPage(1); // Reset pagination

    try {
      const params = new URLSearchParams();
      if (trimmedSource) {
        params.set('utm_source', trimmedSource);
      }
      if (campaignValue.trim()) {
        params.set('utm_campaign', campaignValue.trim());
      }
      if (mediumValue.trim()) {
        params.set('utm_medium', mediumValue.trim());
      }

      const res = await fetch(`/creatorclub/api/admin/contact-logs?${params.toString()}`, {
        signal: options?.signal,
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail =
          typeof payload.detail === 'string' && payload.detail.trim()
            ? payload.detail.trim()
            : null;
        throw new Error(detail || payload.error || 'ดึงข้อมูลไม่สำเร็จ');
      }

      const rawData = payload.data;

      // Determine if data is wrapped in standard envelope (Success, Message, Data)
      let list: ContactLogItem[] = [];
      if (rawData && typeof rawData === 'object') {
        if ('Data' in rawData && Array.isArray((rawData as any).Data)) {
          list = (rawData as any).Data;
        } else if (Array.isArray(rawData)) {
          list = rawData;
        } else if ('data' in rawData && Array.isArray((rawData as any).data)) {
          list = (rawData as any).data;
        }
      }

      if (isStale()) return;
      setLogs(list);

      if (list.length === 0) {
        toast.info('ไม่พบข้อมูล Leads');
      } else {
        toast.success(`โหลดข้อมูลสำเร็จ ${list.length} รายการ`);
      }
    } catch (err: any) {
      if (isStale()) return;
      console.error('Error fetching contact logs:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setLogs([]);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      if (!isStale()) setLoading(false);
    }
  };

  /**
   * Fetch when enabled (e.g. Leads tab is active) — avoids cold-start CIS 500 on dashboard load.
   *
   * Aborting on cleanup matters: React Strict Mode runs this twice on mount, and each run
   * costs a ~15s CIS round trip plus a duplicate success toast.
   */
  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    if (allowSearch) {
      void fetchLogs(utmSource, utmCampaign, utmMedium, { signal: controller.signal });
    } else {
      void fetchLogs('', '', '', { signal: controller.signal });
    }

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, allowSearch, utmSource, utmCampaign, utmMedium]);

  useEffect(() => {
    const customerIds = [
      ...new Set(
        logs
          .map((log) => Number(log.CustomerID))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    if (customerIds.length === 0) {
      setHistoryByCustomer(new Map());
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    void (async () => {
      try {
        const earliest = earliestContactDate(logs);
        const res = await fetch('/creatorclub/api/admin/contact-logs/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerIds,
            startDate: earliest ? shiftDateByDays(earliest, -1) : undefined,
            endDate: todayIsoDate(),
          }),
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const detail = typeof payload.detail === 'string' ? payload.detail.trim() : '';
          throw new Error(detail || payload.error || 'ดึงประวัติการติดต่อไม่สำเร็จ');
        }

        if (cancelled) return;
        setHistoryByCustomer(groupHistoryByCustomer(payload.data ?? []));
      } catch (err: any) {
        if (cancelled) return;
        console.error('Error fetching contact log history:', err);
        setHistoryByCustomer(new Map());
        setHistoryError(err.message || 'เกิดข้อผิดพลาดในการโหลดประวัติการติดต่อ');
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [logs, historyReloadToken]);

  /**
   * Keyed per row rather than per customer: one customer can register several times on
   * different dates, and each registration only owns the touchpoints that followed it.
   */
  const stageByRow = useMemo(() => {
    const stages = new Map<string, LeadStage>();

    for (const log of logs) {
      const customerId = Number(log.CustomerID);
      if (!Number.isFinite(customerId)) continue;

      const rows = historyByCustomer.get(customerId);
      if (!rows) continue;

      stages.set(contactLogRowKey(log), resolveLeadStage(scopeHistoryToLead(rows, log)));
    }

    return stages;
  }, [logs, historyByCustomer]);

  const selectedTimeline = useMemo(() => {
    if (!selectedLog) return [];
    const customerId = Number(selectedLog.CustomerID);
    const rows = Number.isFinite(customerId) ? (historyByCustomer.get(customerId) ?? []) : [];
    return buildLeadTimeline(selectedLog, rows);
  }, [selectedLog, historyByCustomer]);

  useEffect(() => {
    const creatorId = selectedLog?.utm_content?.trim();
    if (!creatorId) {
      setReferrerCreator(null);
      setReferrerCreatorLoading(false);
      setReferrerCreatorNotFound(false);
      return;
    }

    let cancelled = false;
    setReferrerCreatorLoading(true);
    setReferrerCreator(null);
    setReferrerCreatorNotFound(false);

    void (async () => {
      try {
        const creator = await getCreatorById(creatorId);
        if (cancelled) return;
        if (creator) {
          setReferrerCreator(creator);
        } else {
          setReferrerCreatorNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load referrer creator:', err);
        if (!cancelled) setReferrerCreatorNotFound(true);
      } finally {
        if (!cancelled) setReferrerCreatorLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedLog?.utm_content, selectedLog?.CustomerID]);

  const fgfReferrer = useMemo(() => {
    if (!selectedLog) return null;
    return resolveFgfReferrer(selectedLog);
  }, [selectedLog]);

  // Export to Excel using XLSX library
  const handleExportExcel = async () => {
    if (logs.length === 0) return;

    try {
      const { utils, writeFile } = await import('xlsx');

      const rows = logs.map((log, index) => {
        const projId = log.ProjectID;
        const projName = projId != null && projectMap[projId] ? projectMap[projId] : (log.ProjectName || projId || '-');

        const stage = stageByRow.get(contactLogRowKey(log));

        return {
          'ลำดับ': index + 1,
          'CustomerID': log.CustomerID ?? '',
          'ชื่อ': log.CustomerFirstName ?? '',
          'นามสกุล': log.CustomerLastName ?? '',
          'เบอร์โทร': cleanMobile(log.CustomerMobile) || '-',
          'LINE ID': log.CustomerLineID ?? '-',
          'สถานะล่าสุด': stage ? LEAD_EVENT_VISUALS[stage].label : '-',
          'เกรดลูกค้า': log.CustomerGrade ?? '-',
          'รหัสโครงการ': log.ProjectID ?? '',
          'ชื่อโครงการ': projName,
          'ราคาที่สนใจ': log.PriceInterest ?? '-',
          'รูปแบบห้องที่สนใจ': log.ModelInterest ?? '-',
          'วัตถุประสงค์ในการซื้อ': log.PurchasePurpose ?? '-',
          'รหัสโปรโมชั่น': log.PromoCode ?? '-',
          'UTM Source': log.utm_source ?? '',
          'UTM Medium': log.utm_medium ?? '',
          'UTM Campaign': log.utm_campaign ?? '',
          'UTM Content': log.utm_content ?? '',
          'UTM Term': log.utm_term ?? '',
          'Contact Detail': decodeCisContactDetail(String(log.ContactDetail ?? log.Ref ?? '')).trim(),
          'วันที่ลงทะเบียน': [log.ContactDate, log.ContactTime].filter(Boolean).join(' ') || '-',
        };
      });

      const worksheet = utils.json_to_sheet(rows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'UTM Leads');

      const campaignSuffix = searchCampaign.trim() ? `_${searchCampaign.trim()}` : '';
      const sourceLabel = searchSource.trim() || DEFAULT_UTM_SOURCES.join('_');
      const filename = `${new Date().toISOString().split('T')[0]}_utm_leads_${sourceLabel}${campaignSuffix}.xlsx`;

      writeFile(workbook, filename);
      toast.success('ส่งออกข้อมูลเป็น Excel เรียบร้อยแล้ว');
    } catch (err) {
      console.error('Export Excel failed:', err);
      toast.error('ไม่สามารถส่งออกข้อมูลได้');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleReset = () => {
    setSearchSource(utmSource);
    setSearchCampaign(utmCampaign);
    setSearchMedium(utmMedium);
    setLogs([]);
    setError(null);
    void fetchLogs(utmSource, utmCampaign, utmMedium);
  };

  // Client-side pagination calculations
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages || 1);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedLogs = logs.slice(startIndex, startIndex + itemsPerPage);
  const logFrom = logs.length > 0 ? startIndex + 1 : 0;
  const logTo = Math.min(startIndex + itemsPerPage, logs.length);

  return (
    <div className="flex flex-col gap-6">

      {/* Search Section */}
      {allowSearch && (
        <form onSubmit={handleSearchSubmit} className="bg-white rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-neutral-700 text-xl font-medium mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            ค้นหาและคัดกรอง ข้อมูลลงทะเบียน UTM
          </h3>

          <div className="mb-4 rounded-lg border border-border bg-neutral-50 px-4 py-3 text-sm text-muted-foreground">
            ดึงข้อมูลอัตโนมัติจาก utm_source:{' '}
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs text-foreground">creator_club_affiliate</code>
            ,{' '}
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs text-foreground">creatorclub</code>
            {' '}และ{' '}
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs text-foreground">creatorclub_friend_get_friend</code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-600">utm_campaign</label>
              <input
                type="text"
                value={searchCampaign}
                onChange={(e) => setSearchCampaign(e.target.value)}
                placeholder="ระบุ utm_campaign (เลือกระบุ)"
                className="px-4 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-600">utm_medium</label>
              <input
                type="text"
                value={searchMedium}
                onChange={(e) => setSearchMedium(e.target.value)}
                placeholder="ระบุ utm_medium (เลือกระบุ)"
                className="px-4 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={loading}
              className="text-neutral-500 hover:text-neutral-800"
            >
              ล้างค่า
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              center
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังค้นหา...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  ค้นหาข้อมูล
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Results Section */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-primary text-2xl font-medium">
              Leads ทั้งหมด {logs.length > 0 && `(${logs.length})`}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              ซ่อนรายการที่ชื่อ/นามสกุลเป็น Test และชื่อทดสอบที่รู้จัก
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {logs.length > 0 && (
              <Button
                type="button"
                variant="success"
                onClick={handleExportExcel}
                className="w-full sm:w-auto gap-2"
                center
              >
                <FileDown className="w-4 h-4" />
                Export {logs.length}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => fetchLogs(allowSearch ? searchSource : '', allowSearch ? searchCampaign : '', allowSearch ? searchMedium : '')}
              disabled={loading}
              center
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Loading and Error states */}
        {loading ? (
          <div className="text-muted-foreground text-center py-16 flex flex-col items-center gap-3 justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <span className="text-sm">กำลังติดต่อเซิร์ฟเวอร์เพื่อโหลดข้อมูล...</span>
          </div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 text-red-700 p-6 rounded-lg text-center flex flex-col gap-2 items-center justify-center">
            <Info className="w-8 h-8 text-red-500" />
            <p className="font-medium text-lg">เกิดข้อผิดพลาดในการดึงข้อมูล</p>
            <p className="text-sm text-red-600/90">{error}</p>
            {allowSearch && (
              <Button onClick={() => fetchLogs()} variant="error" size="sm" className="mt-2">
                ลองอีกครั้ง
              </Button>
            )}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-muted-foreground text-center py-16 border border-dashed border-border rounded-lg bg-neutral-50/50">
            <Info className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
            <p className="font-medium text-neutral-500">
              {allowSearch
                ? 'ยังไม่พบข้อมูลที่ตรงกับเงื่อนไข'
                : 'ยังไม่พบข้อมูล Leads'}
            </p>
          </div>
        ) : (
          <>
            {/* Stage badges come from a separate CIS call — degrade without breaking the table. */}
            {historyError && (
              <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                <Info className="h-4 w-4 shrink-0" />
                <span>ไม่สามารถโหลดสถานะล่าสุดของ Lead ได้</span>
                <span className="text-xs text-amber-700/90">({historyError})</span>
                <button
                  type="button"
                  onClick={() => setHistoryReloadToken((token) => token + 1)}
                  className="cursor-pointer text-xs font-medium text-amber-900 underline underline-offset-2"
                >
                  ลองอีกครั้ง
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-neutral-50/50">
                    <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">#</th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ชื่อ-นามสกุล</th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">โครงการ</th>
                    <th className='text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>ประเภท</th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">วันที่ลงทะเบียน</th>
                    <th className="text-center py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedLogs.map((log, index) => {
                    const globalIndex = startIndex + index + 1;
                    const projId = log.ProjectID;
                    const projName = projId != null && projectMap[projId] ? projectMap[projId] : (log.ProjectName || projId || 'ไม่ระบุโครงการ');

                    const stage = stageByRow.get(contactLogRowKey(log)) ?? null;

                    return (
                      <tr key={contactLogRowKey(log)} className="hover:bg-neutral-50/30 transition-colors">
                        <td className="py-4 px-4 text-sm text-muted-foreground">{globalIndex}</td>
                        <td className="py-4 px-4 text-sm font-medium text-foreground">
                          {log.CustomerFirstName} {log.CustomerLastName}
                          <LeadStageBadge stage={stage} loading={historyLoading && !historyError} />
                        </td>
                        <td className="py-4 px-4 text-sm text-foreground">
                          <span className="font-medium text-neutral-700">{projName}</span>
                          {projId != null && (
                            <span className="block text-[10px] text-muted-foreground">ID: {projId}</span>
                          )}
                        </td>
                        <td>
                          {LeadTypeByKey(log.utm_campaign ?? '')}
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {log.ContactDate ? new Date(log.ContactDate).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '-'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLog(log);
                              setIsRawJsonOpen(false);
                            }}
                            className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-primary hover:text-primary-dark cursor-pointer inline-flex items-center justify-center"
                            title="ดูรายละเอียดเพิ่มเติม"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-border mt-5 text-sm text-muted-foreground">
                <div>
                  แสดง {logFrom}–{logTo} จาก {logs.length} รายการ
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="px-3 py-1 text-sm flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    ก่อนหน้า
                  </Button>
                  <span className="font-medium">
                    หน้า {safeCurrentPage} จาก {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={safeCurrentPage >= totalPages}
                    className="px-3 py-1 text-sm flex items-center gap-1.5"
                  >
                    ถัดไป
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Drawer */}
      <Drawer
        direction="right"
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DrawerContent className="overflow-y-auto overflow-x-hidden select-text max-w-lg w-full">
          {selectedLog && (
            <>
              <DrawerHeader className="p-7 border-b border-border">
                <DrawerTitle className="text-xl flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  รายละเอียด Lead
                </DrawerTitle>
                <DrawerDescription>
                  ข้อมูลจากระบบ CIS
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-7 py-6 space-y-6">

                {/* Basic Info */}
                <div className="bg-neutral-50 rounded-xl p-4 space-y-3.5 border border-border/50">

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">ชื่อ-นามสกุล</span>
                      <span className="text-sm font-medium text-foreground">{selectedLog.CustomerFirstName} {selectedLog.CustomerLastName}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">LINE ID</span>
                      <span className="text-sm font-medium text-foreground">{selectedLog.CustomerLineID || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">เบอร์โทรศัพท์</span>
                      {cleanMobile(selectedLog.CustomerMobile) ? (
                        <span className='flex gap-1 items-center'>
                          <Phone className="w-3.5 h-3.5" /> {cleanMobile(selectedLog.CustomerMobile)}
                        </span>
                      ) : <span className="text-sm text-muted-foreground">-</span>}
                    </div>
                  </div>

                  <hr className="border-border" />

                  <div className="grid gap-4">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">ผู้แนะนำ</span>
                      {referrerCreatorLoading ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          กำลังโหลด...
                        </span>
                      ) : referrerCreator ? (
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-foreground">
                            {[referrerCreator.name, referrerCreator.lastName].filter(Boolean).join(' ')}
                          </span>
                          {referrerCreator.phone ? (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="w-3.5 h-3.5" />
                              {referrerCreator.phone}
                            </span>
                          ) : null}
                        </div>
                      ) : fgfReferrer ? (
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-foreground">
                            {formatFgfReferrerName(fgfReferrer)}
                          </span>
                          {fgfReferrer.phone ? (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="w-3.5 h-3.5" />
                              {fgfReferrer.phone}
                            </span>
                          ) : null}
                          <span className="block text-[10px] text-muted-foreground">
                            จาก {fgfReferrer.source === 'contact_detail' ? 'Contact Detail' : 'UTM Term (สำรอง)'}
                          </span>
                        </div>
                      ) : selectedLog.utm_content?.trim() ? (
                        <span className="text-sm text-muted-foreground">
                          {referrerCreatorNotFound
                            ? `ไม่พบครีเอเตอร์ (ID: ${selectedLog.utm_content.trim()})`
                            : '-'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">ไม่สามารถดึงข้อมูลผู้แนะนำได้</span>
                      )}
                    </div>
                  </div>
                </div>

                {Number.isFinite(Number(selectedLog.CustomerID)) ? (
                  <LeadContactTimeline
                    events={selectedTimeline}
                    loading={historyLoading}
                    error={historyError}
                    onRetry={() => setHistoryReloadToken((token) => token + 1)}
                  />
                ) : (
                  <div className="rounded-xl border border-border/50 bg-neutral-50 p-4 text-sm text-muted-foreground">
                    ไม่มีรหัสลูกค้า (CustomerID) จาก CIS จึงดูไทม์ไลน์การติดต่อไม่ได้
                  </div>
                )}

                {/* Project & Interest */}
                <div className="bg-neutral-50 rounded-xl p-4 space-y-3.5 border border-border/50">
                  <h4 className="font-semibold text-neutral-700 text-sm border-b border-border/70 pb-1.5">โครงการและความสนใจ</h4>

                  <div>
                    <span className="block text-xs text-muted-foreground mb-0.5">โครงการที่สนใจ</span>
                    <span className="text-sm font-medium text-foreground">
                      {selectedLog.ProjectID != null && projectMap[selectedLog.ProjectID]
                        ? projectMap[selectedLog.ProjectID]
                        : (selectedLog.ProjectName || selectedLog.ProjectID || 'ไม่ระบุ')}
                    </span>
                    {selectedLog.ProjectID != null && (
                      <span className="block text-[10px] text-muted-foreground mt-0.5">CIS Project ID: {selectedLog.ProjectID}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">งบประมาณที่สนใจ</span>
                      <span className="text-sm font-medium text-foreground">{selectedLog.PriceInterest || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">รูปแบบห้อง</span>
                      <span className="text-sm font-medium text-foreground">{selectedLog.ModelInterest || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">วัตถุประสงค์ในการซื้อ</span>
                      <span className="text-sm font-medium text-foreground">{selectedLog.PurchasePurpose || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">รหัสโปรโมชั่น</span>
                      <span className="text-sm font-medium text-foreground">{selectedLog.PromoCode || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* UTM Tracking & Metadata */}
                <div className="bg-neutral-50 rounded-xl p-4 space-y-3.5 border border-border/50">
                  <h4 className="font-semibold text-neutral-700 text-sm border-b border-border/70 pb-1.5">การระบุที่มา (UTM Parameters)</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">UTM Source</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold inline-block">
                        {selectedLog.utm_source || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">UTM Medium</span>
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 text-xs font-semibold inline-block">
                        {selectedLog.utm_medium || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">UTM Campaign</span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold inline-block">
                        {selectedLog.utm_campaign || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">UTM Content</span>
                      <span className="text-sm font-medium text-foreground">{selectedLog.utm_content || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">UTM Term</span>
                      <span className="text-sm font-medium text-foreground">{selectedLog.utm_term || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground mb-0.5">วันที่และเวลานำส่ง</span>
                      <span className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {selectedLog.ContactDate
                          ? `${new Date(`${selectedLog.ContactDate}T00:00:00`).toLocaleDateString('th-TH')}${selectedLog.ContactTime ? ` ${selectedLog.ContactTime} น.` : ''}`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Raw JSON */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsRawJsonOpen(!isRawJsonOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-sm font-medium text-neutral-700 cursor-pointer"
                  >
                    <span>ข้อมูลดิบระบบ CIS (Raw JSON)</span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {isRawJsonOpen ? '[ซ่อน]' : '[แสดง]'}
                    </span>
                  </button>
                  {isRawJsonOpen && (
                    <div className="p-4 bg-neutral-900 border-t border-border">
                      <pre className="text-[10px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 select-all">
                        {JSON.stringify(selectedLog, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

              </div>

              <DrawerFooter className="p-7 border-t border-border mt-auto">
                <div className="w-full flex justify-end gap-2">
                  <DrawerClose asChild>
                    <Button variant="outline" className="px-6 py-2">ปิด</Button>
                  </DrawerClose>
                </div>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

    </div>
  );
}
