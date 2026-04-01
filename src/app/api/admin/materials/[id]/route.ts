import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/modules/utils/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

  if ('projectId' in (body as object)) {
    if (projectId !== undefined && (!projectId || !String(projectId).trim())) {
      return NextResponse.json({ error: 'ต้องระบุโครงการ' }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if ('description' in (body as object)) updates.description = description ?? null;
  if ('projectId' in (body as object) && projectId !== undefined) {
    updates.project_id = projectId.trim();
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('affiliate_materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id:          data.id,
      projectId:   data.project_id ?? undefined,
      title:       data.title,
      description: data.description ?? undefined,
      fileUrl:     data.file_url,
      fileType:    data.file_type,
      createdAt:   data.created_at,
      updatedAt:   data.updated_at ?? undefined,
      s3Key:       data.s3_key ?? undefined,
    });
  } catch (err) {
    console.error('PATCH /api/admin/materials/[id]:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { error } = await supabaseAdmin
      .from('affiliate_materials')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('DELETE /api/admin/materials/[id]:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
