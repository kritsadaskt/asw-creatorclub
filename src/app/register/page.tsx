import { InvitedRegisterPage } from '@/modules/components/landing/InvitedRegisterPage';
import { parseInviteTypeParam } from '@/modules/components/landing/registerInviteCategories';

function normalizeTypeQuery(value: string | string[] | undefined): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.length === 1 ? value[0] ?? null : null;
  return value;
}

export default async function RegisterRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const sp = await searchParams;
  const inviteLabels = parseInviteTypeParam(normalizeTypeQuery(sp.type));

  return <InvitedRegisterPage inviteLabels={inviteLabels} />;
}
