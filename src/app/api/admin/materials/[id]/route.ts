import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/modules/utils/auth';
import { updateAffiliateMaterial } from '@/modules/utils/storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, description, projectId } = body as Record<string, string | undefined>;

  if (title !== undefined && typeof title !== 'string') {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
  }

  const patch: Record<string, string | undefined> = {};
  if (title !== undefined) patch.title = title;
  if ('description' in (body as object)) patch.description = description;
  if ('projectId' in (body as object)) patch.projectId = projectId;

  try {
    const updated = await updateAffiliateMaterial(id, patch);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/admin/materials/[id]:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
