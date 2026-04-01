'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';

export type AdminBreadcrumbItem = { label: string; href?: string };

export function AdminBreadcrumb({ items }: { items: AdminBreadcrumbItem[] }) {
  if (items.length === 0) return null;
  const last = items.length - 1;

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {items.map((item, i) => (
          <Fragment key={`${item.label}-${i}`}>
            <BreadcrumbItem>
              {i === last || !item.href ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {i < last ? <BreadcrumbSeparator /> : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
