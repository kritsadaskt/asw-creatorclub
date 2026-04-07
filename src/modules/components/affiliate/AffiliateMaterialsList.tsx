'use client';

import type { ReactNode } from 'react';

import { Download, Loader2 } from 'lucide-react';

export type AffiliateMaterialListItem = {
  id: string;
  title: string;
  fileType: string;
  fileUrl: string;
};

type Props = {
  loading: boolean;
  materials: AffiliateMaterialListItem[];
  downloadingId: string | null;
  onDownload: (material: AffiliateMaterialListItem) => void;
  renderFileIcon: (fileType: string) => ReactNode;
  loadingText?: string;
  emptyText?: string;
  downloadText?: string;
};

export function AffiliateMaterialsList({
  loading,
  materials,
  downloadingId,
  onDownload,
  renderFileIcon,
  loadingText = 'กำลังโหลดสื่อ...',
  emptyText = 'ยังไม่มีสื่อสำหรับโครงการนี้',
  downloadText = 'ดาวน์โหลด',
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">{loadingText}</span>
      </div>
    );
  }

  if (materials.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <ul className="divide-y divide-border">
      {materials.map((mat) => (
        <li key={mat.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          {/* Thumbnail / icon */}
          {mat.fileType === 'image' ? (
            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mat.fileUrl} alt={mat.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              {renderFileIcon(mat.fileType)}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{mat.title}</p>
            <p className="text-xs text-muted-foreground capitalize">{mat.fileType}</p>
          </div>

          {/* Download button */}
          <button
            type="button"
            onClick={() => onDownload(mat)}
            disabled={downloadingId === mat.id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {downloadingId === mat.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {downloadText}
          </button>
        </li>
      ))}
    </ul>
  );
}

