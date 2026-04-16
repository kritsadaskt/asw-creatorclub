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

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    imageUrl: project.imageUrl,
    thumbUrl: project.thumbUrl,
    projectStatus: project.projectStatus ?? '',
    // Format commission numbers with comma as thousand separator
    commission: (() => {
      const formatNum = (value?: string) => {
        if (!value) return undefined;
        // Only insert commas if not already present
        if (/,\d{3}/.test(value)) return value;
        // Remove any non-digit (such as % or others), format, and add back trailing non-digit
        const match = value.match(/^(\d+)(.*)$/);
        if (match) {
          const numStr = parseInt(match[1], 10).toLocaleString('en-US');
          return numStr + match[2];
        }
        return value;
      };

      if (project.startComm === undefined && project.maxComm === undefined) {
        return undefined;
      }

      const startComm = formatNum(project.startComm);
      const maxComm = formatNum(project.maxComm);

      if (startComm && maxComm) {
        if (startComm !== maxComm) {
          return `${startComm} - ${maxComm} บ.`;
        }
      } else if (startComm === maxComm) {
        return `${maxComm} บ.`;
      }
      return undefined;
    })(),
    googleDriveUrl: project.googleDriveUrl,
    googleDrivePassword: project.googleDrivePassword,
    startComm: (() => {
      const value = project.startComm;
      if (!value) return value;
      if (/,\d{3}/.test(value)) return value;
      const match = value.match(/^(\d+)(.*)$/);
      if (match) {
        const numStr = parseInt(match[1], 10).toLocaleString('en-US');
        return numStr + match[2];
      }
      return value;
    })(),
    maxComm: (() => {
      const value = project.maxComm;
      if (!value) return value;
      if (/,\d{3}/.test(value)) return value;
      const match = value.match(/^(\d+)(.*)$/);
      if (match) {
        const numStr = parseInt(match[1], 10).toLocaleString('en-US');
        return numStr + match[2];
      }
      return value;
    })(),
    materialsUrl: project.baseUrl,
    description: project.description,
    cis_id: project.cisId,
  }));
};

