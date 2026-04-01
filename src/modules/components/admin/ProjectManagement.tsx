'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, Building2, Home, Pencil, Trash2 } from 'lucide-react';
import Select from 'react-select';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import type { Project } from '../../types';
import { getProjects, deleteProject } from '../../utils/storage';

const PAGE_SIZE = 10;

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'condo' | 'house'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'undefined' | 'ready' | 'new' | 'sold_out'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบโครงการนี้หรือไม่?')) {
      try {
        await deleteProject(id);
        await loadProjects();
        toast.success('ลบโครงการสำเร็จ');
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('ไม่สามารถลบโครงการได้');
      }
    }
  };

  const typeOptions = [
    { value: 'all', label: 'ทุกประเภท' },
    { value: 'condo', label: 'คอนโด' },
    { value: 'house', label: 'บ้าน' },
  ];

  const statusOptions = [
    { value: 'all', label: 'ทุกสถานะ' },
    { value: 'undefined', label: 'ไม่ระบุ' },
    { value: 'ready', label: 'พร้อมอยู่' },
    { value: 'new', label: 'โครงการใหม่' },
    { value: 'sold_out', label: 'Pre-sale' },
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      !normalizedQuery ||
      [project.name, project.location, project.description || '', project.baseUrl]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);

    const matchesType = filterType === 'all' || project.type === filterType;

    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'undefined'
          ? !project.projectStatus
          : project.projectStatus === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const pagedProjects = filteredProjects.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2>
            โครงการทั้งหมด ({filteredProjects.length}
            {filteredProjects.length !== projects.length && ` / ${projects.length}`})
          </h2>
        </div>
        <Link
          href="/admin/projects/new"
          className="rounded-lg transition-colors cursor-pointer px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่มโครงการ
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {projects.length > 0 && (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 w-full md:w-auto">
                <div className="w-full md:w-auto">
                  <Input
                    label="ค้นหา"
                    value={searchQuery}
                    onChange={(value) => {
                      setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                    placeholder="ค้นหาโครงการ"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full md:w-auto">
                  <div className="w-full md:w-48">
                    <Select
                      options={typeOptions}
                      value={typeOptions.find((option) => option.value === filterType)}
                      onChange={(option) => {
                        const value = (option?.value || 'all') as 'all' | 'condo' | 'house';
                        setFilterType(value);
                        setCurrentPage(1);
                      }}
                      isClearable={false}
                      classNamePrefix="react-select"
                      placeholder="ประเภท"
                    />
                  </div>
                  <div className="w-full md:w-56">
                    <Select
                      options={statusOptions}
                      value={statusOptions.find((option) => option.value === filterStatus)}
                      onChange={(option) => {
                        const value = (option?.value || 'all') as
                          | 'all'
                          | 'undefined'
                          | 'ready'
                          | 'new'
                          | 'sold_out';
                        setFilterStatus(value);
                        setCurrentPage(1);
                      }}
                      isClearable={false}
                      classNamePrefix="react-select"
                      placeholder="สถานะโครงการ"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No projects found</p>
          </div>
        ) : (
          <div id="admin_project_listing" className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground w-[400px]">
                    โครงการ
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground w-[150px]">
                    ประเภท
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">ทำเล</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">URL</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      ไม่พบโครงการที่ตรงกับการค้นหา/ตัวกรอง
                    </td>
                  </tr>
                ) : (
                  pagedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-foreground">
                            {project.name}
                            {project.projectStatus === 'ready' && (
                              <span className="text-xs text-green-500 ml-2 bg-green-500/10 px-2 py-1 rounded-md">
                                พร้อมอยู่
                              </span>
                            )}
                            {project.projectStatus === 'new' && (
                              <span className="text-xs text-blue-500 ml-2 bg-blue-500/10 px-2 py-1 rounded-md">
                                โครงการใหม่
                              </span>
                            )}
                            {project.projectStatus === 'sold_out' && (
                              <span className="text-xs text-muted-foreground ml-2 bg-muted-foreground/10 px-2 py-1 rounded-md">
                                Pre-sale
                              </span>
                            )}
                          </div>
                          {project.description && (
                            <div className="text-sm text-muted-foreground mt-1">{project.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {project.type === 'condo' ? (
                            <>
                              <Building2 className="w-4 h-4 text-primary" />
                              <span>คอนโด</span>
                            </>
                          ) : (
                            <>
                              <Home className="w-4 h-4 text-primary" />
                              <span>บ้าน</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{project.location}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-muted-foreground max-w-xs truncate">{project.baseUrl}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-end">
                          <Link
                            href={`/admin/projects/${project.id}/edit`}
                            className="p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer inline-flex"
                            title="แก้ไข"
                          >
                            <Pencil className="w-4 h-4 text-primary" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(project.id)}
                            className="p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredProjects.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border text-sm text-muted-foreground">
                <div>
                  แสดง {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredProjects.length)} จาก{' '}
                  {filteredProjects.length} รายการ
                  {filteredProjects.length !== projects.length && (
                    <span className="ml-1 text-xs text-muted-foreground">(ทั้งหมด {projects.length})</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="px-3 py-1 text-sm"
                  >
                    ก่อนหน้า
                  </Button>
                  <span>
                    หน้า {safeCurrentPage} จาก {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
                    disabled={safeCurrentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 text-sm"
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
