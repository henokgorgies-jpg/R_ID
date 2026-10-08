'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Home,
  CreditCard,
  Copy,
  ArrowLeftRight,
  CalendarDays,
  BarChart3,
  UserCog,
  Map,
  Building,
  Building2,
  ScrollText,
  Settings,
  ChevronRight,
  Shield,
  Crown,
  Landmark,
  Network,
  ScanSearch,
  List,
  UserPlus,
  Search,
  PlusCircle,
  ScanLine,
  ClipboardCheck,
  Activity,
  Wifi,
  Database,
  AlertTriangle,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarSeparator,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/auth-context';
import { getMenuForRole, ROLE_DISPLAY_NAMES, type NavMenuItem } from '@/lib/auth/permissions';

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Home,
  CreditCard,
  Copy,
  ArrowLeftRight,
  CalendarDays,
  BarChart3,
  UserCog,
  Map,
  Building,
  Building2,
  ScrollText,
  Settings,
  List,
  UserPlus,
  Search,
  PlusCircle,
  ScanLine,
  ClipboardCheck,
};

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] || LayoutDashboard;
  return <Icon className={className} />;
}

function getBadgeCount(badgeKey: string | undefined, stats: { pendingDuplicates: number; pendingTransfers: number } | null): number | null {
  if (!badgeKey) return null;
  if (!stats) return null;
  if (badgeKey === 'pendingDuplicates') return stats.pendingDuplicates;
  if (badgeKey === 'pendingTransfers') return stats.pendingTransfers;
  return null;
}

function getRoleIcon(role: keyof typeof ROLE_DISPLAY_NAMES) {
  switch (role) {
    case 'super_admin':
      return Crown;
    case 'zone_admin':
      return Landmark;
    case 'woreda_admin':
      return Building2;
    case 'kebele_admin':
      return Network;
    case 'auditor':
      return ScrollText;
    case 'verification_officer':
      return ScanSearch;
    default:
      return Shield;
  }
}

function MenuItem({ item, pathname, stats }: { item: NavMenuItem; pathname: string; stats: { pendingDuplicates: number; pendingTransfers: number } | null }) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const badgeCount = getBadgeCount(item.badge, stats);

  if (item.children && item.children.length > 0) {
    return (
      <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.label}>
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
              {badgeCount !== null && badgeCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-auto h-5 min-w-5 rounded-none border border-rose-300/80 bg-rose-50 px-1.5 text-xs text-rose-800"
                >
                  {badgeCount}
                </Badge>
              )}
              <ChevronRight className="ml-auto opacity-60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                    <Link href={child.href}>
                      <NavIcon name={child.icon} />
                      <span>{child.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <Link href={item.href}>
          <NavIcon name={item.icon} />
          <span>{item.label}</span>
          {badgeCount !== null && badgeCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-auto h-5 min-w-5 rounded-none border border-rose-300/80 bg-rose-50 px-1.5 text-xs text-rose-800"
            >
              {badgeCount}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [stats, setStats] = useState<{ pendingDuplicates: number; pendingTransfers: number } | null>(null);
  const [health, setHealth] = useState<{
    api: 'healthy' | 'offline';
    network: 'online' | 'offline';
    checkedAt: number | null;
  }>({
    api: 'offline',
    network: 'online',
    checkedAt: null,
  });

  if (!user) return null;

  useEffect(() => {
    const updateNetwork = () => {
      setHealth((prev) => ({
        ...prev,
        network: window.navigator.onLine ? 'online' : 'offline',
      }));
    };

    const load = async () => {
      try {
        const res = await fetch('/api/dashboard-stats', { cache: 'no-store' });
        if (!res.ok) {
          setHealth((prev) => ({
            ...prev,
            api: 'offline',
            checkedAt: Date.now(),
          }));
          return;
        }
        const data = await res.json();
        setStats({ pendingDuplicates: data.pendingDuplicates ?? 0, pendingTransfers: data.pendingTransfers ?? 0 });
        setHealth((prev) => ({
          ...prev,
          api: 'healthy',
          checkedAt: Date.now(),
        }));
      } catch {
        setHealth((prev) => ({
          ...prev,
          api: 'offline',
          checkedAt: Date.now(),
        }));
      }
    };

    updateNetwork();
    void load();
    const interval = window.setInterval(() => {
      updateNetwork();
      void load();
    }, 60000);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  const menuSections = getMenuForRole(user.role);
  const RoleIcon = getRoleIcon(user.role);
  const queueLoad = (stats?.pendingDuplicates ?? 0) + (stats?.pendingTransfers ?? 0);
  const queueTone =
    queueLoad >= 15 ? 'text-amber-700' : 'text-emerald-700';
  const queueLabel = queueLoad >= 15 ? 'Busy queue' : 'Queue stable';
  const apiHealthy = health.api === 'healthy';
  const networkOnline = health.network === 'online';
  const checkedLabel = health.checkedAt
    ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(health.checkedAt))
    : 'Checking';

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-sidebar-border/80 bg-[linear-gradient(180deg,hsl(var(--sidebar))_0%,hsl(var(--sidebar)/0.96)_46%,hsl(var(--sidebar)/0.92)_100%)] shadow-[0_0_0_1px_hsl(var(--sidebar-border)/0.45),10px_0_30px_-20px_hsl(var(--foreground)/0.4)]"
    >
      <SidebarHeader className="gap-3 border-b border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_16px_30px_-18px_hsl(var(--primary)/0.8)]">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-[-0.01em]">Civil Registry</span>
                  <span className="truncate text-xs text-muted-foreground">Operations Console</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="rounded-none border border-sidebar-border/75 bg-background/60 p-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-center gap-2 text-center">
            <RoleIcon className="h-4 w-4 text-sky-700" />
            <p className="truncate text-xs font-semibold text-sidebar-foreground/85">
              Active Role: <span className="text-sidebar-foreground">{ROLE_DISPLAY_NAMES[user.role]}</span>
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        {menuSections.map((section) => (
          <SidebarGroup key={section.title} className="mb-1">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/65">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {section.items.map((item) => (
                  <MenuItem key={item.href} item={item} pathname={pathname} stats={stats} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="border-t border-sidebar-border/70 bg-background/45 p-2.5">
        <div className="rounded-none border border-sidebar-border/75 bg-background/70 p-3 group-data-[collapsible=icon]:hidden">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-700" />
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/80">System Health</span>
            </div>
            <Badge
              variant="outline"
              className={apiHealthy && networkOnline ? 'rounded-none border-emerald-300 bg-emerald-50 text-emerald-800' : 'rounded-none border-rose-300 bg-rose-50 text-rose-800'}
            >
              {apiHealthy && networkOnline ? 'Healthy' : 'Attention'}
            </Badge>
          </div>
          <div className="space-y-2 text-xs text-sidebar-foreground/75">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className={`size-3.5 ${apiHealthy ? 'text-emerald-700' : 'text-rose-700'}`} />
                <span>API</span>
              </div>
              <span className={apiHealthy ? 'text-emerald-700' : 'text-rose-700'}>{apiHealthy ? 'Reachable' : 'Unavailable'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wifi className={`size-3.5 ${networkOnline ? 'text-emerald-700' : 'text-rose-700'}`} />
                <span>Network</span>
              </div>
              <span className={networkOnline ? 'text-emerald-700' : 'text-rose-700'}>{networkOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`size-3.5 ${queueTone}`} />
                <span>Workflow</span>
              </div>
              <span className={queueTone}>{queueLabel}</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-sidebar-foreground/55">Last checked {checkedLabel}</p>
        </div>
        <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
          <div className={`flex size-8 items-center justify-center rounded-lg border ${apiHealthy && networkOnline ? 'border-emerald-300/80 bg-emerald-50 text-emerald-700' : 'border-rose-300/80 bg-rose-50 text-rose-700'}`}>
            <Activity className="size-4" />
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
