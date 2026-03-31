# AWS OIDC + Vercel Setup (No Access Keys)

Use IAM Role via OIDC federation instead of long-lived access keys.
The AWS SDK v3 default credential chain handles everything automatically.

## How It Works

- **Production (Vercel):** Vercel sets `AWS_ROLE_ARN` + `AWS_WEB_IDENTITY_TOKEN_FILE` → SDK calls `AssumeRoleWithWebIdentity` (OIDC)
- **Local dev:** `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` in `.env.local` → SDK uses direct credentials
- Same code, no changes needed between environments

---

## Step 1 — Create OIDC Identity Provider in AWS

Go to **IAM → Identity providers → Add provider**

| Field | Value |
|-------|-------|
| Provider type | OpenID Connect |
| Provider URL | `https://oidc.vercel.com` |
| Audience | `https://vercel.com` |

Click **Get thumbprint** then **Add provider**.

---

## Step 2 — Create IAM Role

Go to **IAM → Roles → Create role**

1. Select **Web identity**
2. Identity provider: `oidc.vercel.com`
3. Audience: `https://vercel.com`
4. Attach this inline policy (S3 only, least privilege):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

5. Name the role: `asw-creatorclub-vercel`

---

## Step 3 — Update Trust Policy on the Role

After creating, edit the trust policy to lock it to your specific Vercel project:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/oidc.vercel.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com:aud": "https://vercel.com"
        },
        "StringLike": {
          "oidc.vercel.com:sub": "owner:YOUR_VERCEL_TEAM_SLUG:project:asw-creatorclub:environment:*"
        }
      }
    }
  ]
}
```

Replace:
- `YOUR_ACCOUNT_ID` — AWS account ID (top-right in AWS console)
- `YOUR_VERCEL_TEAM_SLUG` — Vercel → Settings → General → Team Slug

---

## Step 4 — Vercel Environment Variables

Go to **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::ACCOUNT_ID:role/asw-creatorclub-vercel` |
| `AWS_REGION` | `ap-southeast-1` |
| `AWS_S3_BUCKET` | `your-bucket-name` |
| `AWS_S3_PUBLIC_URL` | `https://your-bucket.s3.ap-southeast-1.amazonaws.com` |

**Remove** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from Vercel entirely.

---

## Step 5 — Local Dev (.env.local)

Add to `.env.local` (never commit this file):

```bash
AWS_ACCESS_KEY_ID=your-local-dev-key
AWS_SECRET_ACCESS_KEY=your-local-dev-secret
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your-bucket-name
AWS_S3_PUBLIC_URL=https://your-bucket.s3.ap-southeast-1.amazonaws.com
```

---

## Code Change (already applied)

`src/lib/s3.ts` — credentials removed, SDK resolves them automatically:

```ts
export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
  // No credentials field — SDK uses default chain (OIDC in prod, keys in local)
});
```

---

## Verify After Deploy

In Vercel function logs, a successful OIDC assumption looks like:
```
assumed role: arn:aws:sts::ACCOUNT_ID:assumed-role/asw-creatorclub-vercel/...
```

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `InvalidClientTokenId` | Trust policy `sub` mismatch | Double-check `YOUR_VERCEL_TEAM_SLUG` and project name in trust policy |
| `AccessDenied` | Role policy too restrictive | Verify S3 bucket ARN in inline policy matches actual bucket name |
| `ExpiredTokenException` | Token refresh issue | Redeploy — Vercel refreshes OIDC tokens per invocation |
| Credentials not found (local) | `.env.local` missing keys | Add `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` to `.env.local` |
