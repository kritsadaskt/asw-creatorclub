'use client';

import { useRouter } from 'next/navigation';
import { AdminBreadcrumb } from '@/modules/components/admin/AdminBreadcrumb';
import { ProjectForm } from '@/modules/components/admin/ProjectForm';

export default function AdminProjectNewPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <AdminBreadcrumb
        items={[
          { label: 'จัดการโครงการ', href: '/admin/projects' },
          { label: 'เพิ่มโครงการ' },
        ]}
      />
      <ProjectForm
        mode="create"
        initialProject={null}
        onCancel={() => router.push('/admin/projects')}
        onSaved={(p) => router.push(`/admin/projects/${p.id}/edit`)}
      />
    </div>
  );
}
