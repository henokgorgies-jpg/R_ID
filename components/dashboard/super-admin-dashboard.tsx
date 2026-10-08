'use client';

import { useEffect, useState } from 'react';
import { WorkspaceCard } from '@/components/layout/page-shell';

type Stats = { residents: number; activeResidents: number; households: number; pendingTransfers: number; pendingDuplicates: number; lifeEvents: number; users: number };

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { void fetch('/api/dashboard-stats', { cache: 'no-store' }).then((r) => r.json()).then(setStats).catch(() => null); }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <WorkspaceCard title="Residents" description="Total / Active"><p className="text-2xl font-semibold">{stats ? `${stats.residents} / ${stats.activeResidents}` : '...'}</p></WorkspaceCard>
      <WorkspaceCard title="Households" description="Registered"><p className="text-2xl font-semibold">{stats?.households ?? '...'}</p></WorkspaceCard>
      <WorkspaceCard title="Users" description="Active"><p className="text-2xl font-semibold">{stats?.users ?? '...'}</p></WorkspaceCard>
      <WorkspaceCard title="Pending Transfers" description="Need approval"><p className="text-2xl font-semibold">{stats?.pendingTransfers ?? '...'}</p></WorkspaceCard>
      <WorkspaceCard title="Duplicate Cases" description="Need review"><p className="text-2xl font-semibold">{stats?.pendingDuplicates ?? '...'}</p></WorkspaceCard>
      <WorkspaceCard title="Life Events" description="Recorded"><p className="text-2xl font-semibold">{stats?.lifeEvents ?? '...'}</p></WorkspaceCard>
    </div>
  );
}
