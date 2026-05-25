'use client';

import React, { useState, useEffect } from 'react';
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
import { filterExcludedContactLogLeads } from '@/lib/excluded-contact-log-leads';
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

interface ContactLogItem {
  ContactLogID: number;
  Fname: string;
  Lname: string;
  Tel: string;
  Email: string;
  ProjectID?: number;
  ProjectName?: string;
  RefDate?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  PriceInterest?: string;
  ModelInterest?: string;
  PromoCode?: string;
  PurchasePurpose?: string;
  LineID?: string;
  [key: string]: any;
}

interface UtmContactLogsTableProps {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  allowSearch?: boolean;
}

export function UtmContactLogsTable({
  utmSource = 'creatorclub',
  utmCampaign = '',
  utmMedium = '',
  allowSearch = true
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
  const fetchLogs = async (sourceValue = searchSource, campaignValue = searchCampaign, mediumValue = searchMedium) => {
    const trimmedSource = sourceValue.trim();
    if (!trimmedSource) {
      toast.error('กรุณาระบุ utm_source (Required)');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentPage(1); // Reset pagination

    try {
      const params = new URLSearchParams();
      params.set('utm_source', trimmedSource);
      if (campaignValue.trim()) {
        params.set('utm_campaign', campaignValue.trim());
      }
      if (mediumValue.trim()) {
        params.set('utm_medium', mediumValue.trim());
      }

      const res = await fetch(`/creatorclub/api/admin/contact-logs?${params.toString()}`);
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error || 'ดึงข้อมูลไม่สำเร็จ');
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

      const filteredList = filterExcludedContactLogLeads(list);
      setLogs(filteredList);

      if (filteredList.length === 0) {
        toast.info('ไม่พบข้อมูลการลงทะเบียนที่ตรงกับเงื่อนไข');
      } else {
        toast.success(`โหลดข้อมูลสำเร็จ ${filteredList.length} รายการ`);
      }
    } catch (err: any) {
      console.error('Error fetching contact logs:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setLogs([]);
      toast.error(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount if allowSearch is false and utmSource is provided
  useEffect(() => {
    if (!allowSearch && utmSource) {
      fetchLogs(utmSource, utmCampaign, utmMedium);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowSearch, utmSource, utmCampaign, utmMedium]);

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
  }, [selectedLog?.utm_content, selectedLog?.ContactLogID]);

  // Export to Excel using XLSX library
  const handleExportExcel = async () => {
    if (logs.length === 0) return;

    try {
      const { utils, writeFile } = await import('xlsx');

      const rows = logs.map((log, index) => {
        const projId = log.ProjectID;
        const projName = projId != null && projectMap[projId] ? projectMap[projId] : (log.ProjectName || projId || '-');

        return {
          'ลำดับ': index + 1,
          'ContactLogID': log.ContactLogID ?? '',
          'ชื่อ': log.CustomerFirstName ?? '',
          'นามสกุล': log.CustomerLastName ?? '',
          'เบอร์โทร': log.Tel === 'NULL' ? '-' : (log.Tel ?? ''),
          'อีเมล': log.Email === 'NULL' ? '-' : (log.Email ?? ''),
          'LINE ID': log.LineID ?? '-',
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
          'วันที่ลงทะเบียน': log.RefDate ? new Date(log.RefDate).toLocaleString('th-TH') : '-',
        };
      });

      const worksheet = utils.json_to_sheet(rows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'UTM Leads');

      const campaignSuffix = searchCampaign.trim() ? `_${searchCampaign.trim()}` : '';
      const filename = `${new Date().toISOString().split('T')[0]}_utm_leads_${searchSource.trim()}${campaignSuffix}.xlsx`;

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-600">
                utm_source <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value)}
                placeholder="ระบุ utm_source (เช่น facebook, tiktok)"
                required
                className="px-4 py-2 bg-neutral-50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>

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
              disabled={loading || !searchSource.trim()}
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
            {!allowSearch && (
              <p className="text-sm text-muted-foreground mt-1">
                กรองตาม utm_campaign: <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono text-xs">{utmCampaign}</code>
              </p>
            )}
          </div>

          {logs.length > 0 && (
            <div className="flex gap-2 w-full sm:w-auto">
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
              {!allowSearch && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchLogs(utmSource, utmCampaign, utmMedium)}
                  disabled={loading}
                  center
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          )}
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
                ? 'กรุณากรอก utm_source และกดปุ่มค้นหาข้อมูล'
                : 'ไม่พบข้อมูลผู้ลงทะเบียนสำหรับแคมเปญนี้'}
            </p>
          </div>
        ) : (
          <>
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

                    return (
                      <tr key={log.ContactLogID || globalIndex} className="hover:bg-neutral-50/30 transition-colors">
                        <td className="py-4 px-4 text-sm text-muted-foreground">{globalIndex}</td>
                        <td className="py-4 px-4 text-sm font-medium text-foreground">
                          {log.CustomerFirstName} {log.CustomerLastName}
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
                      {selectedLog.CustomerMobile && selectedLog.CustomerMobile !== 'NULL' ? (
                        <span className='flex gap-1 items-center'>
                          <Phone className="w-3.5 h-3.5" /> {selectedLog.CustomerMobile.replace('\'', '')}
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
                        <span className="text-sm font-medium text-foreground">
                          {[referrerCreator.name, referrerCreator.lastName].filter(Boolean).join(' ')}
                        </span>
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
                        {selectedLog.RefDate ? new Date(selectedLog.RefDate).toLocaleString('th-TH') : '-'}
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
