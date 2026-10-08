'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, ChevronDown, MapPin, User, ShieldCheck, Clock3, Plus, ScanSearch, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ROLE_DISPLAY_NAMES } from '@/lib/auth/permissions';
import { Breadcrumbs } from './breadcrumbs';

function getModuleLabel(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[1] ?? 'dashboard';
  const labels: Record<string, string> = {
    dashboard: 'Operations Overview',
    residents: 'Resident Management',
    households: 'Household Registry',
    duplicates: 'Duplicate Resolution',
    transfers: 'Transfer Operations',
    'id-cards': 'ID Card Operations',
    verification: 'Verification Queue',
    finance: 'Finance Monitoring',
    admin: 'Administration',
    settings: 'System Settings',
  };
  return labels[segment] ?? 'Operations Module';
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, getScopeDisplayName } = useAuth();

  if (!user) return null;

  const userNotifications: Array<{ id: string; title: string; message: string }> = [];
  const initials = `${user.firstName[0]}${user.lastName[0]}`;
  const now = new Date();
  const clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const today = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[linear-gradient(100deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94),rgba(236,253,245,0.92))] backdrop-blur-md">
      <div className="mx-auto flex h-[74px] w-full items-center gap-2 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <div className="hidden items-center gap-2 rounded-none border border-slate-300/80 bg-white/85 px-2.5 py-1.5 lg:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700">Civil Registry</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <Breadcrumbs />
          <div className="mt-1 hidden items-center gap-2 text-xs text-slate-600 md:flex">
            <span className="inline-flex items-center gap-1 rounded-none border border-sky-300/80 bg-sky-50/80 px-2 py-0.5 text-sky-800">
              <LayoutGrid className="h-3.5 w-3.5 text-sky-700" />
              {getModuleLabel(pathname)}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-none border border-slate-300/80 bg-white/85 px-2.5 py-1.5 text-xs text-slate-600 xl:flex">
            <Clock3 className="h-3.5 w-3.5 text-sky-700" />
            <span className="font-semibold text-slate-700">{clock}</span>
            <span>{today}</span>
          </div>

          <div className="hidden items-center gap-1 rounded-none border border-emerald-300/80 bg-emerald-50/75 px-2 py-1.5 lg:flex">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            <span className="max-w-[220px] truncate text-xs text-emerald-900">{getScopeDisplayName()}</span>
          </div>

          <Button asChild size="sm" variant="outline" className="hidden rounded-none border-slate-300 bg-white/90 lg:inline-flex">
            <Link href="/residents/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Resident
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="hidden rounded-none border-slate-300 bg-white/90 lg:inline-flex">
            <Link href="/duplicates">
              <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
              Duplicates
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative rounded-none border-slate-300 bg-white/90">
                <Bell className="h-4 w-4" />
                {userNotifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-none border border-rose-300/80 bg-rose-50 px-1 text-[10px] font-semibold text-rose-800">
                    {userNotifications.length}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge className="rounded-none border border-sky-300/80 bg-sky-50 text-sky-800" variant="secondary">
                  {userNotifications.length}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
              ) : (
                userNotifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3">
                    <span className="font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-2">{notification.message}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 rounded-none border-slate-300 bg-white/90 px-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-emerald-700 text-xs font-semibold text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-sm font-semibold leading-none text-slate-800">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-xs text-slate-500">{ROLE_DISPLAY_NAMES[user.role]}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Badge
                  variant="secondary"
                  className="mr-2 rounded-none border border-sky-300/80 bg-sky-50 text-sky-800"
                >
                  {ROLE_DISPLAY_NAMES[user.role]}
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-4 py-1.5 md:hidden">
        <div className="inline-flex items-center gap-1 rounded-none border border-emerald-300/80 bg-emerald-50/75 px-2 py-1 text-[11px] text-emerald-900">
          <MapPin className="h-3.5 w-3.5 text-emerald-700" />
          <span className="max-w-[230px] truncate">{getScopeDisplayName()}</span>
        </div>
      </div>
    </header>
  );
}
