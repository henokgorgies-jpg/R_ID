'use client';

import Link from 'next/link';
import { type LucideIcon, UserPlus, CreditCard, Copy, ArrowLeftRight, ScanLine, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions, Protected } from '@/lib/auth/auth-context';
import type { Permission } from '@/lib/data/types';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Register Resident',
    description: 'Add a new resident to the registry',
    href: '/residents/new',
    icon: UserPlus,
    permission: 'residents:create',
  },
  {
    label: 'Generate ID',
    description: 'Create a new Kebele ID card',
    href: '/id-cards/generate',
    icon: CreditCard,
    permission: 'id:generate',
  },
  {
    label: 'Review Duplicates',
    description: 'Check flagged duplicate records',
    href: '/duplicates',
    icon: Copy,
    permission: 'duplicates:review',
  },
  {
    label: 'Process Transfer',
    description: 'Handle resident transfer requests',
    href: '/transfers',
    icon: ArrowLeftRight,
    permission: 'transfers:view',
  },
  {
    label: 'Verify ID',
    description: 'Scan and verify a Kebele ID',
    href: '/id-cards/verify',
    icon: ScanLine,
    permission: 'id:verify',
  },
  {
    label: 'View Reports',
    description: 'Access system reports',
    href: '/reports',
    icon: FileText,
    permission: 'reports:view',
  },
];

export function QuickActions() {
  const { can } = usePermissions();

  // Filter actions based on permissions
  const availableActions = QUICK_ACTIONS.filter(
    action => !action.permission || can(action.permission)
  );

  if (availableActions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableActions.map((action) => (
            <Button
              key={action.href}
              variant="outline"
              className="h-auto justify-start gap-3 p-3"
              asChild
            >
              <Link href={action.href}>
                <action.icon className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    {action.description}
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
