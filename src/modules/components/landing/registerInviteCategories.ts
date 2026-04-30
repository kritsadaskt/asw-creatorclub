const MAX_INVITE_TYPE_LENGTH = 200;

/**
 * Single `type` query value on `/register?type=...` (invite grouping).
 * Returned array is passed as `inviteLabels` to the invited register page; invite type is stored in `profiles.type`.
 */
export function parseInviteTypeParam(param: string | null): string[] | null {
  if (param == null) return null;
  const raw = param.trim();
  if (!raw) return null;
  if (raw.length > MAX_INVITE_TYPE_LENGTH) return null;
  return [raw];
}
