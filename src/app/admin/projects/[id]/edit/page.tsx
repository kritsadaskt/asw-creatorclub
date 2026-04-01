'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AdminBreadcrumb } from '@/modules/components/admin/AdminBreadcrumb';
import { ProjectForm } from '@/modules/components/admin/ProjectForm';
import { ProjectMaterialsLibrary } from '@/modules/components/admin/ProjectMaterialsLibrary';
import type { Project } from '@/modules/types';
import { getProjectById } from '@/modules/utils/storage';

export default function AdminProjectEditPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getProjectById(id);
        if (!cancelled) setProject(p);
      } catch {
        if (!cancelled) setProject(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">ไม่พบโครงการ</p>
        <Link href="/admin/projects" className="text-primary hover:underline mt-2 inline-block">
          กลับไปรายการโครงการ
        </Link>
      </div>
    );
  }

  if (project === undefined) {
    return (
      <div className="container mx-auto p-6 flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <AdminBreadcrumb
          items={[
            { label: 'จัดการโครงการ', href: '/admin/projects' },
            { label: 'ไม่พบโครงการ' },
          ]}
        />
        <p className="text-muted-foreground mb-4">ไม่พบโครงการที่ต้องการแก้ไข</p>
        <Link href="/admin/projects" className="text-primary hover:underline">
          กลับไปรายการโครงการ
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <AdminBreadcrumb
        items={[
          { label: 'จัดการโครงการ', href: '/admin/projects' },
          { label: project.name },
        ]}
      />
      <ProjectForm
        mode="edit"
        initialProject={project}
        onCancel={() => router.push('/admin/projects')}
        onSaved={(p) => setProject(p)}
        heading="แก้ไขโครงการ"
      />
      <ProjectMaterialsLibrary projectId={project.id} />
    </div>
  );
}
