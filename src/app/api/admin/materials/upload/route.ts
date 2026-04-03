import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { uploadToS3 } from '@/lib/s3';

export async function POST(request: NextRequest) {
  const isLocalStack = !!process.env.AWS_ENDPOINT_URL;
  if (
    !process.env.AWS_S3_BUCKET ||
    (!isLocalStack && (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY))
  ) {
    return NextResponse.json(
      { error: 'AWS S3 ไม่ได้รับการตั้งค่า กรุณาติดต่อผู้ดูแลระบบ' },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const materialId = formData.get('materialId') as string | null;

    if (!file || !materialId) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const key = `materials/${materialId}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadToS3(key, buffer, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('S3 upload error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/materials/upload',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
