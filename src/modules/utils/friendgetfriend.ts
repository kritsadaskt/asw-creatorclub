import { BASE_PATH } from '@/lib/publicPath';
import type { AffiliateProject } from './affiliate';

export const fetchFriendGetFriendProjects = async (): Promise<AffiliateProject[]> => {
  const res = await fetch(`${BASE_PATH}/api/friendgetfriend/projects`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Failed to fetch friendgetfriend projects: ${res.status} ${errText}`.trim()
    );
  }

  return (await res.json()) as AffiliateProject[];
};

