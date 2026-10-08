'use client';

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'bg-muted/70 text-foreground',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-green-500/15 text-green-700 dark:text-green-300',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  danger: 'bg-destructive/15 text-destructive',
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  variant = 'default',
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn('rounded-lg p-2 shadow-[inset_0_1px_0_hsl(var(--background)/0.55)]', variantStyles[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-[-0.03em]">{value.toLocaleString()}</div>
        {(description || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span className={cn(
                'rounded-full px-2 py-0.5 font-semibold',
                trend.value >= 0 ? 'bg-green-500/15 text-green-700 dark:text-green-300' : 'bg-destructive/15 text-destructive'
              )}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
            )}
            {description && <span>{description}</span>}
            {trend?.label && <span>{trend.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
