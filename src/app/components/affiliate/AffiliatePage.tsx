import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CampaignLayout } from '../layout/CampaignLayout';
import { fetchAffiliateProjects, type AffiliateProject } from '../../utils/affiliate';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose
} from '../ui/drawer';

export function AffiliatePage() {
  return (
    <CampaignLayout>
      <AffiliateProjectList />
    </CampaignLayout>
  );
}

function AffiliateProjectList() {
  const [projects, setProjects] = useState<AffiliateProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<AffiliateProject | null>(null);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchAffiliateProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to load affiliate projects', err);
        setError('ไม่สามารถโหลดข้อมูลโครงการได้');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  return (
    <div className="py-7 md:py-12">
      <div className="bg-white rounded-2xl shadow-xl border border-border p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-primary">
              Affiliate Properties
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              เลือกโครงการที่คุณต้องการโปรโมต ดูคอมมิชชั่น และเข้าถึงสื่อสำหรับใช้ทำคอนเทนต์ได้ที่นี่
            </p>
          </div>
          <Link
            to="/creatorclub"
            title="Back to Creator Club"
            className="text-primary hover:underline text-sm md:text-base"
          >
            กลับไปหน้า Creator Club
          </Link>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            กำลังโหลดข้อมูลโครงการ...
          </div>
        ) : error ? (
          <div className="py-8 px-4 bg-destructive/5 border border-destructive/40 rounded-xl text-destructive text-center">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            ขณะนี้ยังไม่มีโครงการสำหรับ Affiliate
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left font-medium text-foreground">
                    โครงการ
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left font-medium text-foreground">
                    ค่าแนะนำ
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right font-medium text-foreground">
                    View Materials
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/30">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-40 h-40 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground">
                          {project.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={project.imageUrl}
                              alt={project.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="px-1 text-center">
                              ไม่มีรูปภาพ
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {project.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 align-top">
                      <div className="text-muted-foreground max-w-xs">
                        {project.commission || 'จะประกาศคอมมิชชั่นเร็ว ๆ นี้'}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 align-top">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProject(project);
                            setIsMaterialsOpen(true);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-primary px-3 py-1.5 text-xs md:text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          View Materials
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        direction="right"
        open={isMaterialsOpen && !!selectedProject}
        onOpenChange={(open) => {
          setIsMaterialsOpen(open);
          if (!open) {
            setSelectedProject(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              วัสดุสำหรับโปรโมต
            </DrawerTitle>
            <DrawerDescription>
              ดาวน์โหลดสื่อสำหรับใช้ทำคอนเทนต์ของคุณสำหรับโครงการนี้
            </DrawerDescription>
          </DrawerHeader>

          {selectedProject && (
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground">
                  {selectedProject.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedProject.imageUrl}
                      alt={selectedProject.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="px-1 text-center">
                      ไม่มีรูปภาพ
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedProject.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedProject.commission || 'จะประกาศคอมมิชชั่นเร็ว ๆ นี้'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  ไฟล์สำหรับดาวน์โหลด
                </p>
                <p className="text-xs text-muted-foreground">
                  ตัวอย่าง: รูปภาพ วิดีโอ และข้อความตัวอย่างสำหรับโพสต์จะถูกแสดงในส่วนนี้เชื่อมต่อจากหลังบ้าน
                </p>
                <div className="mt-2 space-y-1 text-xs text-primary">
                  <a
                    href={selectedProject.materialsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-primary px-3 py-1.5 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    เปิดหน้า Landing Page ของโครงการ
                  </a>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <DrawerClose className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
              ปิด
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
