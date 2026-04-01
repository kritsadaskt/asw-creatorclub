import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/modules/utils/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, title, description, projectId, fileUrl, fileType, s3Key } =
    body as Record<string, string | undefined>;

  if (!id || !title || !fileUrl || !fileType) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
  }

  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
    return NextResponse.json({ error: 'ต้องระบุโครงการ' }, { status: 400 });
  }

  if (!['image', 'pdf', 'video'].includes(fileType)) {
    return NextResponse.json({ error: 'fileType ไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('affiliate_materials')
      .upsert(
        {
          id,
          project_id:  projectId.trim(),
          title,
          description: description ?? null,
          file_url:    fileUrl,
          file_type:   fileType,
          s3_key:      s3Key ?? null,
        },
        { onConflict: 'id' }
      );

    if (error) throw error;

    return new NextResponse(null, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/materials:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
