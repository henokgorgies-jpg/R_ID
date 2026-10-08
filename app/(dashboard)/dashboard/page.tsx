"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Building2, Clock3, FileCheck2, Home, ShieldCheck, Users2 } from "lucide-react";
import {
  AgeDistributionChart,
  GenderDistributionChart,
  LocationComparisonChart,
  PopulationTrendChart,
} from "@/components/dashboard/charts";

type Stats = {
  residents: number;
  activeResidents: number;
  households: number;
  pendingTransfers: number;
  pendingDuplicates: number;
  lifeEvents: number;
  users: number;
  males?: number;
  females?: number;
  charts?: {
    ageData: Array<{ ageGroup: string; male: number; female: number }>;
    trendData: Array<{ month: string; registrations: number; transfers_in: number; transfers_out: number; deaths: number }>;
    zoneData: Array<{ name: string; population: number; households: number }>;
  };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/dashboard-stats", { cache: "no-store" });
      if (!res.ok) return;
      setStats(await res.json());
    };
    void load();
  }, []);

  if (!user) return null;

  const cards = [
    {
      key: "residents",
      title: "Residents",
      value: stats ? stats.residents.toLocaleString() : "...",
      sub: stats ? `${stats.activeResidents.toLocaleString()} active records` : "Loading active records",
      icon: Users2,
      tone: "from-sky-100 to-cyan-50 border-sky-200/70",
      href: "/residents",
    },
    {
      key: "households",
      title: "Households",
      value: stats ? stats.households.toLocaleString() : "...",
      sub: "Family units registered",
      icon: Home,
      tone: "from-emerald-100 to-teal-50 border-emerald-200/70",
      href: "/households",
    },
    {
      key: "users",
      title: "System Users",
      value: stats ? stats.users.toLocaleString() : "...",
      sub: "Active staff accounts",
      icon: ShieldCheck,
      tone: "from-violet-100 to-indigo-50 border-violet-200/70",
      href: "/admin/users",
    },
    {
      key: "transfers",
      title: "Pending Transfers",
      value: stats ? stats.pendingTransfers.toLocaleString() : "...",
      sub: "Need approval attention",
      icon: Clock3,
      tone: "from-amber-100 to-orange-50 border-amber-200/70",
      href: "/transfers",
    },
    {
      key: "duplicates",
      title: "Duplicate Cases",
      value: stats ? stats.pendingDuplicates.toLocaleString() : "...",
      sub: "Require manual review",
      icon: AlertTriangle,
      tone: "from-rose-100 to-red-50 border-rose-200/70",
      href: "/duplicates",
    },
    {
      key: "events",
      title: "Life Events",
      value: stats ? stats.lifeEvents.toLocaleString() : "...",
      sub: "Recorded activity entries",
      icon: FileCheck2,
      tone: "from-slate-100 to-zinc-50 border-slate-200/70",
      href: "/life-events",
    },
  ];

  const highestQueue = Math.max(stats?.pendingTransfers ?? 0, stats?.pendingDuplicates ?? 0);
  const queueLabel =
    highestQueue === (stats?.pendingDuplicates ?? 0) ? "Duplicate review queue is highest" : "Transfer approval queue is highest";

  return (
    <PageShell
      title="Operations Dashboard"
      description={`Role: ${user.role} • Scope: ${user.scope.type}`}
      hideHeader
      actions={
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="rounded-none">
            <Link href="/residents/new">Register Resident</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-none">
            <Link href="/duplicates">Review Duplicates</Link>
          </Button>
        </div>
      }
    >
      <section className="relative overflow-hidden rounded-none border border-slate-300/70 bg-[linear-gradient(120deg,#ffffff_0%,#eef6ff_50%,#f3fbf2_100%)] p-5 shadow-sm md:p-7">
        <div className="absolute right-0 top-0 h-24 w-24 bg-[radial-gradient(circle,_rgba(59,130,246,0.2)_0%,_transparent_70%)]" />
        <div className="absolute bottom-0 left-0 h-20 w-20 bg-[radial-gradient(circle,_rgba(16,185,129,0.2)_0%,_transparent_70%)]" />
        <div className="relative grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-none border border-slate-300 bg-white/90 text-slate-700">
              Civil Registry Monitoring
            </Badge>
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-900 md:text-3xl">
              Daily registration and identity operations overview
            </h2>
            <p className="max-w-3xl text-sm text-slate-600 md:text-base">
              Monitor approval workload, duplicate investigations, resident growth, and demographic trends from one command
              surface.
            </p>
          </div>
          <div className="grid gap-3 rounded-none border border-slate-300/70 bg-white/80 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-none border border-rose-300/80 bg-rose-50 p-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Priority Queue</p>
                <p className="text-xs text-slate-600">{queueLabel}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{highestQueue.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-none bg-slate-200">
              <div className="h-full bg-rose-400" style={{ width: `${Math.min((highestQueue / 100) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.key}
              href={card.href}
              className={`group rounded-none border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.tone}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{card.title}</p>
                  <p className="text-3xl font-bold tracking-[-0.03em] text-slate-900">{card.value}</p>
                  <p className="text-sm text-slate-600">{card.sub}</p>
                </div>
                <div className="rounded-none border border-slate-300/70 bg-white/75 p-2">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs font-medium text-slate-700">
                Open module
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {stats?.charts && (
        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-none border border-slate-300/70 bg-white p-4">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">Population Intelligence</h3>
              <p className="text-sm text-slate-600">Demographic and geographic insights based on active resident records.</p>
            </div>
            <Building2 className="h-5 w-5 text-slate-500" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <PopulationTrendChart data={stats.charts.trendData} />
            <GenderDistributionChart male={stats.males ?? 0} female={stats.females ?? 0} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <AgeDistributionChart data={stats.charts.ageData} />
            <LocationComparisonChart
              data={stats.charts.zoneData}
              title="Zone Comparison"
              description="Population and households by zone"
            />
          </div>
        </section>
      )}
    </PageShell>
  );
}
