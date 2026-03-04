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
   * Base URL for materials or landing page related to this project.
   */
  materialsUrl: string;
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
    // Map future backend fields here when available.
    imageUrl: undefined,
    commission: project.description,
    materialsUrl: project.baseUrl,
  }));
};

