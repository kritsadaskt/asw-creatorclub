/** Human-readable sync time in Asia/Bangkok for Shlink cache `synced_at` (UTC ISO). */
export function formatStatsSyncedAtBangkok(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
