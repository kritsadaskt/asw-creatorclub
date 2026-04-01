import type { ReactNode } from 'react';
import { Image, FileText, Video } from 'lucide-react';
import type { AffiliateMaterial } from '../../types';

export type MaterialFileType = AffiliateMaterial['fileType'];

export const FILE_TYPE_FILTER_OPTIONS: { value: 'all' | MaterialFileType; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'image', label: 'รูป' },
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'วิดีโอ' },
];

export function materialFileTypeLabel(fileType: MaterialFileType): string {
  if (fileType === 'image') return 'รูปภาพ';
  if (fileType === 'pdf') return 'PDF';
  return 'วิดีโอ';
}

export function MaterialTypeIcon({
  fileType,
  className,
  size = 20,
}: {
  fileType: MaterialFileType;
  className?: string;
  size?: number;
}): ReactNode {
  if (fileType === 'image') return <Image size={size} className={className} />;
  if (fileType === 'pdf') return <FileText size={size} className={className} />;
  return <Video size={size} className={className} />;
}

export function inferMaterialFileType(file: File): MaterialFileType | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

export function acceptForMaterialUpload(): string {
  return 'image/*,application/pdf,video/*';
}
