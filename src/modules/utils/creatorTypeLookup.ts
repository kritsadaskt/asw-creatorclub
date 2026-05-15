import type { CreatorTypeRow } from '@/modules/types';

const MAX_INVITE_TYPE_PARAM_LENGTH = 200;

/**
 * Map an invite `?type=` value to a canonical `creator_type.key` using the same alias rules as filters.
 * Returns null when unknown or too long (no matching row).
 */
export function resolveInviteParamToCreatorTypeKey(
  param: string | null | undefined,
  creatorTypes: Pick<CreatorTypeRow, 'key'>[],
): string | null {
  if (param == null) return null;
  const raw = param.trim();
  if (!raw || raw.length > MAX_INVITE_TYPE_PARAM_LENGTH) return null;
  for (const row of creatorTypes) {
    if (profileTypeMatchesCreatorTypeFilter(raw, row.key)) {
      return row.key;
    }
  }
  return null;
}

/** Registration UX for `/register` when `profiles.type` matches this `creator_type` row. */
export function registrationFlowForCreatorTypeKey(
  canonicalKey: string | null | undefined,
  creatorTypes: CreatorTypeRow[],
): 'standard' | 'household' | 'pageant' | null {
  if (!canonicalKey?.trim()) return null;
  const row = creatorTypes.find((r) => r.key === canonicalKey.trim());
  const f = row?.registrationFlow;
  if (f === 'standard' || f === 'household' || f === 'pageant') return f;
  return null;
}

/**
 * Legacy `profiles.type` values grouped under canonical `creator_type.key` from Supabase.
 * Keys not listed here match only by exact case-insensitive equality with `profiles.type`.
 */
const PROFILE_TYPE_ALIASES_BY_CANONICAL_KEY: Record<string, readonly string[]> = {
  assetwise_staff: ['assetwise_staff', 'asw_staff', 'staff'],
  asw_household: ['asw_household', 'asw_houshold', 'household'],
  mister_int: ['mister_int', 'mi'],
  miss_world_th: ['miss_world_th', 'miss_world', 'mut'],
  miss_th: ['miss_th'],
  mr_mrs_global: ['mr_mrs_global'],
};

/** True when `profileType` should appear under the admin/directory filter for `filterKey` (`creator_type.key`). */
export function profileTypeMatchesCreatorTypeFilter(
  profileType: string | undefined,
  filterKey: string,
): boolean {
  const raw = (profileType ?? '').trim().toLowerCase();
  const key = filterKey.trim().toLowerCase();
  if (!key) return false;
  if (!raw) return false;
  const aliases = PROFILE_TYPE_ALIASES_BY_CANONICAL_KEY[key];
  if (aliases) {
    return aliases.some((a) => a.toLowerCase() === raw);
  }
  return raw === key;
}

/** First matching row in DB order → Thai label for display/export. */
export function resolveCreatorTypeThLabel(
  profileType: string | undefined,
  creatorTypesOrdered: Pick<CreatorTypeRow, 'key' | 'nameTh' | 'nameEn'>[],
): string {
  const raw = (profileType ?? '').trim().toLowerCase();
  if (!raw) return 'บุคคลทั่วไป';
  for (const row of creatorTypesOrdered) {
    if (profileTypeMatchesCreatorTypeFilter(profileType, row.key)) {
      const th = (row.nameTh ?? '').trim();
      if (th) return th;
      const en = (row.nameEn ?? '').trim();
      return en || row.key;
    }
  }
  return 'บุคคลทั่วไป';
}
