import { NextRequest, NextResponse } from 'next/server';
import { fetchAffiliateProjects, type AffiliateProject } from '@/modules/utils/affiliate';
import type { SessionRole } from '@/modules/utils/auth';

type AswSessionCookie = {
  id: string;
  role: SessionRole;
};

function decodeAswSessionCookie(value: string | undefined): AswSessionCookie | null {
  if (!value) return null;

  try {
    const json = Buffer.from(value, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as Partial<AswSessionCookie>;

    if (
      typeof parsed.id === 'string' &&
      (parsed.role === 'creator' || parsed.role === 'admin')
    ) {
      return parsed as AswSessionCookie;
    }
  } catch {
    // Ignore invalid cookie values.
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get('asw_session')?.value;
    const session = decodeAswSessionCookie(cookieValue);
    const role = session?.role ?? null;

    const projects = await fetchAffiliateProjects();

    const sanitized: AffiliateProject[] =
      role === 'creator'
        ? projects
        : projects.map((p) => ({
            ...p,
            // Material is only visible to registered creators.
            googleDriveUrl: undefined,
            googleDrivePassword: undefined,
            materialsUrl: '',
          }));

    return NextResponse.json(sanitized, { status: 200 });
  } catch (error) {
    console.error('friendgetfriend/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to load projects' },
      { status: 500 }
    );
  }
}

