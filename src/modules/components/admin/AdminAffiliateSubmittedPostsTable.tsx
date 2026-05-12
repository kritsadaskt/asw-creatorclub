'use client';

import type { AdminAffiliateSubmittedPostLinkRow } from '@/modules/types/adminAffiliateReports';
import { CreatorBadge } from '../ui/creator-badge';
import { cn } from '../ui/utils';

type Props = {
  rows: AdminAffiliateSubmittedPostLinkRow[];
  /** Dashboard: open creator drawer. Omitted on standalone page. */
  onSelectCreator?: (creatorId: string) => void | Promise<void>;
  variant?: 'summary' | 'full';
  /** Applied to the scroll wrapper (e.g. max-h on dashboard preview). */
  wrapperClassName?: string;
};

export function AdminAffiliateSubmittedPostsTable({
  rows,
  onSelectCreator,
  variant = 'summary',
  wrapperClassName,
}: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีลิงก์ที่ส่งโพสต์ให้ตรวจ</p>;
  }

  const isFull = variant === 'full';

  return (
    <div className={cn('overflow-auto rounded-lg border border-border', wrapperClassName)}>
      <table className={cn('w-full text-left text-sm', isFull ? 'min-w-[720px]' : 'min-w-[640px]')}>
        <thead className="sticky top-0 z-[1] border-b border-border bg-muted/80 backdrop-blur-sm">
          <tr className="text-muted-foreground">
            {isFull ? (
              <>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">แคมเปญ</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">โครงการ</th>
                <th className="px-3 py-2.5 font-medium">ลิงก์ Affiliate</th>
              </>
            ) : (
              <th className="px-3 py-2.5 font-medium whitespace-nowrap w-2/12">โครงการ</th>
            )}
            <th className={cn('px-3 py-2.5 font-medium', isFull ? '' : 'w-7/12')}>ลิงก์โพสต์</th>
            <th className={cn('px-3 py-2.5 font-medium whitespace-nowrap', isFull ? '' : 'w-3/12')}>
              ครีเอเตอร์
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.linkId} className="border-b border-border/80 align-top last:border-b-0">
              {isFull ? (
                <>
                  <td className="max-w-[10rem] break-words px-3 py-2.5 text-foreground">{row.campaignName}</td>
                  <td className="max-w-[9rem] break-words px-3 py-2.5 text-foreground">{row.projectName}</td>
                  <td className="px-3 py-2.5">
                    {row.affiliateUrl ? (
                      <a
                        href={row.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-primary underline-offset-2 hover:underline"
                      >
                        {row.affiliateUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </>
              ) : (
                <td className="break-words px-3 py-2.5 text-foreground">{row.projectName}</td>
              )}
              <td className="px-3 py-2.5">
                <ul className="list-none space-y-1.5 break-all">
                  {row.postLinks.map((href, i) => (
                    <li key={`${row.linkId}-p-${i}`}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {href}
                      </a>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                  {onSelectCreator ? (
                    <button
                      type="button"
                      className="max-w-[12rem] cursor-pointer break-words text-left text-primary underline-offset-2 hover:underline sm:max-w-none"
                      onClick={() => void onSelectCreator(row.creatorId)}
                      aria-label={`ดูรายละเอียด ${row.displayName}`}
                    >
                      {row.displayName}
                    </button>
                  ) : (
                    <span className="max-w-[12rem] break-words text-foreground sm:max-w-none">{row.displayName}</span>
                  )}
                  <CreatorBadge type={row.inviteType} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
