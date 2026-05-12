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
    <div
      className={cn(
        'overflow-auto rounded-lg border border-border',
        wrapperClassName,
      )}
    >
      <table className={cn('w-full text-left text-sm', isFull ? 'min-w-[720px]' : 'min-w-[640px]')}>
        <thead className="sticky top-0 z-[1] border-b border-border bg-muted/80 backdrop-blur-sm">
          <tr className="text-muted-foreground">
            <th className="px-3 py-2.5 font-medium whitespace-nowrap">โครงการ</th>
            <th className={cn('px-3 py-2.5 font-medium', isFull ? '' : 'w-7/12')}>ลิงก์โพสต์</th>
            <th className={cn('px-3 py-2.5 font-medium whitespace-nowrap', isFull ? '' : 'w-3/12')}>
              ครีเอเตอร์
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.linkId} className="border-b border-border/80 align-top last:border-b-0">
              <td className="px-3 py-2.5 text-foreground break-words max-w-[9rem]">
                {row.projectName}
              </td>
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
              <td className="px-3 py-2.5 whitespace-nowrap">
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                  {onSelectCreator ? (
                    <button
                      type="button"
                      className="text-left text-primary hover:underline underline-offset-2 cursor-pointer break-words max-w-[12rem] sm:max-w-none"
                      onClick={() => void onSelectCreator(row.creatorId)}
                      aria-label={`ดูรายละเอียด ${row.displayName}`}
                    >
                      {row.displayName}
                    </button>
                  ) : (
                    <span className="break-words text-foreground max-w-[12rem] sm:max-w-none">
                      {row.displayName}
                    </span>
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
