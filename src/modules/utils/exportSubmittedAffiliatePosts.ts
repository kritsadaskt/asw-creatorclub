import type { AdminAffiliateSubmittedPostLinkRow } from '@/modules/types/adminAffiliateReports';

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export affiliate links that creators submitted post URLs for.
 * One CSV row per post URL (multiple posts on the same affiliate link → multiple rows).
 */
export function exportSubmittedAffiliatePostsToCsv(rows: AdminAffiliateSubmittedPostLinkRow[]): void {
  if (rows.length === 0) return;

  const header = [
    'Link ID',
    'Creator ID',
    'Creator Name',
    'Creator Type',
    'Project',
    'Campaign',
    'Affiliate URL',
    'Post Link',
    'Post Link Index',
    'Created At',
  ];

  const csvLines = [header.join(',')];

  for (const row of rows) {
    const postLinks = row.postLinks.length > 0 ? row.postLinks : [''];
    postLinks.forEach((postLink, index) => {
      csvLines.push(
        [
          row.linkId,
          row.creatorId,
          row.displayName,
          row.inviteType,
          row.projectName,
          row.campaignName,
          row.affiliateUrl,
          postLink,
          String(index + 1),
          row.createdAt,
        ]
          .map((cell) => escapeCsv(cell))
          .join(','),
      );
    });
  }

  const blob = new Blob([`\uFEFF${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${new Date().toISOString().split('T')[0]}_affiliate_submitted_posts.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
