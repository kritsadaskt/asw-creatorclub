import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Credentials resolved automatically by the AWS SDK default chain:
//   Production (Vercel): AWS_ROLE_ARN + AWS_WEB_IDENTITY_TOKEN_FILE → AssumeRoleWithWebIdentity (OIDC)
//   Local dev:           AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY   → direct credentials
//   LocalStack:          AWS_ENDPOINT_URL=http://localhost:4566       → local S3 emulation
export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: true,
  }),
});

export const uploadToS3 = async (
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> => {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET not configured');

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  const publicUrl = process.env.AWS_S3_PUBLIC_URL?.replace(/\/$/, '');
  return `${publicUrl}/${key}`;
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET not configured');

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};
