'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment } from 'react';

// Route labels mapping
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  residents: 'Residents',
  new: 'Register New',
  search: 'Search',
  households: 'Households',
  'id-cards': 'ID Cards',
  generate: 'Generate ID',
  verify: 'Verify ID',
  duplicates: 'Duplicates',
  transfers: 'Transfers',
  'life-events': 'Life Events',
  reports: 'Reports',
  finance: 'Finance',
  income: 'Income',
  transactions: 'Transactions',
  admin: 'Administration',
  users: 'Users',
  zones: 'Zones',
  woredas: 'Woredas',
  kebeles: 'Kebeles',
  'audit-logs': 'Audit Logs',
  settings: 'Settings',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  
  // Split pathname and filter empty segments
  const segments = pathname.split('/').filter(Boolean);
  
  // Don't show breadcrumbs on dashboard root
  if (segments.length <= 1 && segments[0] === 'dashboard') {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbItems: Array<{ label: string; href: string; isLast: boolean }> = [];
  
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    
    // Skip UUID-like segments in breadcrumbs display but keep in path
    const isUUID = /^[0-9a-f-]{36}$/.test(segment) || segment.startsWith('resident-') || segment.startsWith('household-');
    
    if (!isUUID) {
      breadcrumbItems.push({
        label: ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        href: currentPath,
        isLast,
      });
    }
  });

  if (breadcrumbItems.length === 0) return null;

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <Fragment key={item.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage className="font-semibold tracking-[-0.01em]">{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
