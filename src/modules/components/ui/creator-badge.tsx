interface CreatorBadgeProps {
  type: string;
}

const badgeMap: Record<string, { label: string; className: string }> = {
  assetwise_staff: {
    label: 'ASSETWISE',
    className:
      'inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-blue-50 text-blue-700 border border-blue-200/80',
  },
  asw_household: {
    label: 'ลูกบ้าน',
    className:
      'inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-violet-50 text-violet-700 border border-violet-200/80',
  },
  mi: {
    label: 'MI',
    className:
      'inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-teal-50 text-teal-800 border border-teal-200/80',
  },
  mut: {
    label: 'MUT',
    className:
      'inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-rose-50 text-rose-800 border border-rose-200/80',
  },
  mister_int: {
    label: 'Mister Inter',
    className:
      'inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-teal-50 text-teal-700 border border-teal-200/80',
  },
  miss_world: {
    label: 'Miss World',
    className:
      'inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-pink-50 text-pink-700 border border-pink-200/80',
  },
  mr_mrs_global: {
    label: 'Mr. & Mrs. Global',
    className:
      'inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-pink-50 text-pink-700 border border-pink-200/80',
  },
  miss_th: {
    label: 'นางสาวไทย',
    className:
      'inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-pink-50 text-pink-700 border border-pink-200/80',
  },
};

/** Maps `profiles.type` (and common aliases) to a `badgeMap` key, or null when no badge (บุคคลทั่วไป / ไม่ระบุ). */
function inviteTypeToBadgeKey(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (t === 'general' || t === 'resident' || t === 'partner') return null;
  if (t === 'assetwise_staff' || t === 'asw_staff' || t === 'staff') return 'assetwise_staff';
  if (t === 'asw_household' || t === 'asw_houshold' || t === 'household') return 'asw_household';
  if (t === 'mi') return 'mi';
  if (t === 'mut') return 'mut';
  if (badgeMap[t]) return t;
  return null;
}

export function CreatorBadge({ type }: CreatorBadgeProps) {
  const key = inviteTypeToBadgeKey(type);
  if (!key) return null;
  const badge = badgeMap[key];
  if (!badge) return null;
  return (
    <span className={badge.className}>
      {badge.label}
    </span>
  );
}
