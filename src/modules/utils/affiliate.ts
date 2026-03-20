import { getProjects } from './storage';
import type { Project } from '../types';

export interface AffiliateProject {
  id: string;
  name: string;
  /**
   * Optional image URL for the project, configured by admin/backend.
   */
  imageUrl?: string;
  /**
   * Optional commission information (e.g. '3% ของราคาขาย').
   */
  commission?: string;
  /**
   * Optional Google Drive URL for downloadable materials.
   */
  googleDriveUrl?: string;
  /**
   * Optional Google Drive password for the materials folder.
   */
  googleDrivePassword?: string;
  /**
   * Optional project status from DB: 'ready' | 'new' | 'sold_out'.
   */
  projectStatus?: string;
  /**
   * Optional commission range fields.
   */
  startComm?: string;
  maxComm?: string;
  /**
   * Base URL for materials or landing page related to this project.
   */
  materialsUrl: string;
  description?: string;
}

/**
 * Fetch affiliate projects from backend.
 * Currently uses the existing `projects` table and maps to a UI-friendly shape.
 * If the backend later adds explicit image/commission fields, wire them into this mapper.
 */
export const fetchAffiliateProjects = async (): Promise<AffiliateProject[]> => {
  const projects: Project[] = await getProjects();

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    imageUrl: project.imageUrl,
    projectStatus: project.projectStatus ?? '',
    // Prefer structured commission range; fall back to description.
    commission:
      project.startComm && project.maxComm
        ? `ค่าแนะนำ: ${project.startComm} - ${project.maxComm}`
        : project.startComm
          ? `ค่าแนะนำ: ${project.startComm}`
          : project.maxComm
            ? `ค่าแนะนำสูงสุด: ${project.maxComm}`
            : undefined,
    googleDriveUrl: project.googleDriveUrl,
    googleDrivePassword: project.googleDrivePassword,
    startComm: project.startComm,
    maxComm: project.maxComm,
    materialsUrl: project.baseUrl,
    description: project.description,
  }));
};

