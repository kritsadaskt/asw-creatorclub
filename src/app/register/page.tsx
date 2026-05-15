import { InvitedRegisterPage } from '@/modules/components/landing/InvitedRegisterPage';
import { resolveInviteParamToCreatorTypeKey } from '@/modules/utils/creatorTypeLookup';
import { getCreatorTypes } from '@/modules/utils/storage';

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
  const rawType = normalizeTypeQuery(sp.type);
  const creatorTypes = await getCreatorTypes();
  const rawTrimmed = rawType?.trim() ?? '';
  const canonical = rawTrimmed ? resolveInviteParamToCreatorTypeKey(rawTrimmed, creatorTypes) : null;
  const inviteLabels = rawTrimmed ? (canonical ? [canonical] : null) : null;

  return (
    <InvitedRegisterPage
      inviteLabels={inviteLabels}
      inviteType={canonical}
      creatorTypes={creatorTypes}
    />
  );
}
