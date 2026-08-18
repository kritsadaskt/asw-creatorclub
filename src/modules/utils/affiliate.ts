import { formatCommissionInput, formatCommissionRange } from '@/lib/commission-display';
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
   * Optional fallback thumbnail URL (from DB `projects.thumb_url`).
   */
  thumbUrl?: string;
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
   * When true, affiliate links page shows a promo label (table amounts stay unchanged).
   */
  commMultiplyEnabled?: boolean;
  /** Factor shown on the affiliate promo label (e.g. x2). Default 2. */
  commMultiplyFactor?: number;
  /**
   * Base URL for materials or landing page related to this project.
   */
  materialsUrl: string;
  description?: string;
  cis_id?: number;
}

/**
 * Fetch affiliate projects from backend.
 * Currently uses the existing `projects` table and maps to a UI-friendly shape.
 * If the backend later adds explicit image/commission fields, wire them into this mapper.
 */
export const fetchAffiliateProjects = async (): Promise<AffiliateProject[]> => {
  const projects: Project[] = await getProjects();  

  return projects.map((project) => {
    const startComm = formatCommissionInput(project.startComm);
    const maxComm = formatCommissionInput(project.maxComm);

    return {
      id: project.id,
      name: project.name,
      imageUrl: project.imageUrl,
      thumbUrl: project.thumbUrl,
      projectStatus: project.projectStatus ?? '',
      commission: formatCommissionRange(startComm, maxComm),
      googleDriveUrl: project.googleDriveUrl,
      googleDrivePassword: project.googleDrivePassword,
      startComm,
      maxComm,
      commMultiplyEnabled: Boolean(project.commMultiplyEnabled),
      commMultiplyFactor: project.commMultiplyFactor,
      materialsUrl: project.baseUrl,
      description: project.description,
      cis_id: project.cisId,
    };
  });
};

