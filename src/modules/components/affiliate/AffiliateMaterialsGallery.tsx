'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, Copy, Image, FileText, Video, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AffiliateMaterial, Project } from '../../types';
import { getAffiliateMaterials, getProjects } from '../../utils/storage';

const PAGE_SIZE = 20;

const FILE_TYPE_ICON = {
  image: <Image size={20} className="text-muted-foreground" />,
  pdf: <FileText size={20} className="text-muted-foreground" />,
  video: <Video size={20} className="text-muted-foreground" />,
};

export function AffiliateMaterialsGallery() {
  const [materials, setMaterials] = useState<AffiliateMaterial[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadMaterials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadProjects = async () => {
    try {
      const projs = await getProjects();
      setProjects(projs);
    } catch {
      // non-critical
    }
  };

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const { data, count } = await getAffiliateMaterials({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setMaterials(data);
      setTotalCount(count);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials =
    selectedProjectId === 'all'
      ? materials
      : materials.filter((m) => m.projectId === selectedProjectId);

  // Collect unique projectIds that actually appear in materials
  const usedProjectIds = new Set(materials.map((m) => m.projectId).filter(Boolean));
  const filterableProjects = projects.filter((p) => usedProjectIds.has(p.id));

  const handleDownload = async (material: AffiliateMaterial) => {
    setDownloading(material.id);
    try {
      const response = await fetch(material.fileUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const ext = material.fileUrl.split('.').pop()?.split('?')[0] ?? 'bin';
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${material.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setDownloading(null);
    }
  };

  const handleCopyCaption = (description: string) => {
    navigator.clipboard
      .writeText(description)
      .then(() => toast.success('คัดลอก Caption แล้ว!'))
      .catch(() => toast.error('ไม่สามารถคัดลอกได้'));
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={36} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">สื่อการตลาด</h1>
        <p className="text-muted-foreground text-sm">ดาวน์โหลดและใช้สื่อสำหรับการโปรโมทโครงการ</p>
      </div>

      {/* Project filter */}
      {filterableProjects.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedProjectId('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              selectedProjectId === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-foreground hover:bg-muted'
            }`}
          >
            ทั้งหมด
          </button>
          {filterableProjects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                selectedProjectId === p.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {filteredMaterials.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">ยังไม่มีสื่อการตลาด</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMaterials.map((m) => (
              <div
                key={m.id}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col"
              >
                {/* Thumbnail */}
                <div className="h-40 bg-muted flex items-center justify-center overflow-hidden">
                  {m.fileType === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.fileUrl}
                      alt={m.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {FILE_TYPE_ICON[m.fileType]}
                      <span className="text-xs">
                        {m.fileType === 'pdf' ? 'PDF' : 'วิดีโอ'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <p className="font-medium text-sm line-clamp-2 mb-1">{m.title}</p>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">
                      {m.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-2">
                    <button
                      onClick={() => handleDownload(m)}
                      disabled={downloading === m.id}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-medium bg-primary text-primary-foreground rounded-lg py-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {downloading === m.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      ดาวน์โหลด
                    </button>
                    {m.description && (
                      <button
                        onClick={() => handleCopyCaption(m.description!)}
                        className="flex items-center justify-center gap-1 text-xs font-medium border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                        title="คัดลอก Caption"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 text-sm text-muted-foreground">
              <span>หน้า {page + 1} / {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= totalCount}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
