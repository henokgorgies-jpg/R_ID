// ============================================
// Permission System & Role Configuration
// ============================================

import { type UserRole, type Permission } from '@/lib/data/types';

export type Role = UserRole;

// Define all permissions by role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // Full access to everything
    'residents:create', 'residents:read', 'residents:update', 'residents:delete', 'residents:export',
    'households:create', 'households:read', 'households:update', 'households:delete',
    'id:generate', 'id:verify', 'id:reissue', 'id:revoke',
    'duplicates:review', 'duplicates:merge', 'duplicates:flag',
    'transfers:initiate', 'transfers:approve', 'transfers:reject', 'transfers:view',
    'events:create', 'events:read', 'events:update',
    'reports:view', 'reports:export', 'reports:create',
    'finance:view',
    'admin:users', 'admin:zones', 'admin:woredas', 'admin:kebeles', 'admin:settings',
    'audit:view', 'audit:export',
  ],
  
  zone_admin: [
    // Zone-level management
    'residents:create', 'residents:read', 'residents:update', 'residents:export',
    'households:create', 'households:read', 'households:update',
    'id:generate', 'id:verify', 'id:reissue',
    'duplicates:review', 'duplicates:merge', 'duplicates:flag',
    'transfers:initiate', 'transfers:approve', 'transfers:reject', 'transfers:view',
    'events:create', 'events:read', 'events:update',
    'reports:view', 'reports:export', 'reports:create',
    'finance:view',
    'admin:woredas', 'admin:kebeles',
    'audit:view',
  ],
  
  woreda_admin: [
    // Woreda-level management
    'residents:create', 'residents:read', 'residents:update', 'residents:export',
    'households:create', 'households:read', 'households:update',
    'id:generate', 'id:verify', 'id:reissue',
    'duplicates:review', 'duplicates:merge', 'duplicates:flag',
    'transfers:initiate', 'transfers:approve', 'transfers:reject', 'transfers:view',
    'events:create', 'events:read', 'events:update',
    'reports:view', 'reports:export',
    'finance:view',
    'admin:kebeles',
    'audit:view',
  ],
  
  kebele_admin: [
    // Kebele-level operations
    'residents:create', 'residents:read', 'residents:update',
    'households:create', 'households:read', 'households:update',
    'id:generate', 'id:verify', 'id:reissue',
    'duplicates:review', 'duplicates:merge', 'duplicates:flag',
    'transfers:initiate', 'transfers:view',
    'events:create', 'events:read', 'events:update',
    'reports:view',
    'finance:view',
  ],
  
  auditor: [
    // Read-only audit access
    'residents:read',
    'households:read',
    'duplicates:review',
    'transfers:view',
    'events:read',
    'reports:view', 'reports:export',
    'finance:view',
    'audit:view', 'audit:export',
  ],
  
  verification_officer: [
    // ID verification only
    'residents:read',
    'id:verify',
  ],
};

// Role display names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  zone_admin: 'Zone Admin',
  woreda_admin: 'Woreda Admin',
  kebele_admin: 'Kebele Admin',
  auditor: 'Auditor',
  verification_officer: 'Verification Officer',
};

export const ROLE_LABELS = ROLE_DISPLAY_NAMES;

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full system access at city level. Manages all zones, woredas, and kebeles.',
  zone_admin: 'Manages all woredas and kebeles within assigned zone.',
  woreda_admin: 'Manages all kebeles within assigned woreda.',
  kebele_admin: 'Day-to-day operations for assigned kebele.',
  auditor: 'Read-only access for compliance and auditing.',
  verification_officer: 'ID verification and validation only.',
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccess(role: UserRole, permission: Permission): boolean {
  return hasPermission(role, permission);
}

// Check if a role has any of the given permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

// Check if a role has all of the given permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Get all permissions for a role
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// Navigation menu items configuration
export interface NavMenuItem {
  label: string;
  href: string;
  icon: string;
  permissions?: Permission[];
  badge?: string;
  children?: NavMenuItem[];
}

export interface NavMenuSection {
  title: string;
  items: NavMenuItem[];
}

// Get menu configuration based on role
export function getMenuForRole(role: UserRole): NavMenuSection[] {
  const allMenuSections: NavMenuSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'Registry',
      items: [
        { 
          label: 'Residents', 
          href: '/residents', 
          icon: 'Users',
          permissions: ['residents:read'],
          children: [
            { label: 'All Residents', href: '/residents', icon: 'List', permissions: ['residents:read'] },
            { label: 'Register New', href: '/residents/new', icon: 'UserPlus', permissions: ['residents:create'] },
            { label: 'Pending Queue', href: '/residents/pending', icon: 'ClipboardCheck', permissions: ['residents:update'] },
            { label: 'Search', href: '/residents/search', icon: 'Search', permissions: ['residents:read'] },
          ],
        },
        { 
          label: 'Households', 
          href: '/households', 
          icon: 'Home',
          permissions: ['households:read'],
        },
      ],
    },
    {
      title: 'ID Management',
      items: [
        { 
          label: 'ID Cards', 
          href: '/id-cards', 
          icon: 'CreditCard',
          permissions: ['id:generate', 'id:verify'],
          children: [
            { label: 'All ID Cards', href: '/id-cards', icon: 'List', permissions: ['id:generate'] },
            { label: 'Generate ID', href: '/id-cards/generate', icon: 'PlusCircle', permissions: ['id:generate'] },
            { label: 'Verify ID', href: '/id-cards/verify', icon: 'ScanLine', permissions: ['id:verify'] },
          ],
        },
        { 
          label: 'Duplicates', 
          href: '/duplicates', 
          icon: 'Copy',
          permissions: ['duplicates:review'],
          badge: 'pendingDuplicates',
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        { 
          label: 'Transfers', 
          href: '/transfers', 
          icon: 'ArrowLeftRight',
          permissions: ['transfers:view', 'transfers:initiate'],
          badge: 'pendingTransfers',
        },
        { 
          label: 'Life Events', 
          href: '/life-events', 
          icon: 'CalendarDays',
          permissions: ['events:read', 'events:create'],
        },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { 
          label: 'Reports', 
          href: '/reports', 
          icon: 'BarChart3',
          permissions: ['reports:view'],
        },
        {
          label: 'Income',
          href: '/finance/income',
          icon: 'BarChart3',
          permissions: ['finance:view'],
        },
        {
          label: 'Transactions',
          href: '/finance/transactions',
          icon: 'ScrollText',
          permissions: ['finance:view'],
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        { 
          label: 'Users', 
          href: '/admin/users', 
          icon: 'UserCog',
          permissions: ['admin:users'],
        },
        { 
          label: 'Zones', 
          href: '/admin/zones', 
          icon: 'Map',
          permissions: ['admin:zones'],
        },
        { 
          label: 'Woredas', 
          href: '/admin/woredas', 
          icon: 'Building',
          permissions: ['admin:woredas'],
        },
        { 
          label: 'Kebeles', 
          href: '/admin/kebeles', 
          icon: 'Building2',
          permissions: ['admin:kebeles'],
        },
        { 
          label: 'Audit Logs', 
          href: '/audit-logs', 
          icon: 'ScrollText',
          permissions: ['audit:view'],
        },
        { 
          label: 'Settings', 
          href: '/settings', 
          icon: 'Settings',
          permissions: ['admin:settings'],
        },
      ],
    },
  ];

  // Filter menu sections based on role permissions
  const filteredSections: NavMenuSection[] = [];
  
  for (const section of allMenuSections) {
    const filteredItems = section.items.filter(item => {
      if (!item.permissions || item.permissions.length === 0) return true;
      return hasAnyPermission(role, item.permissions);
    });
    
    if (filteredItems.length > 0) {
      // Filter children as well
      const itemsWithFilteredChildren = filteredItems.map(item => {
        if (!item.children) return item;
        const filteredChildren = item.children.filter(child => {
          if (!child.permissions || child.permissions.length === 0) return true;
          return hasAnyPermission(role, child.permissions);
        });
        return { ...item, children: filteredChildren.length > 0 ? filteredChildren : undefined };
      });
      
      filteredSections.push({
        title: section.title,
        items: itemsWithFilteredChildren,
      });
    }
  }
  
  return filteredSections;
}

// Geographic scope helpers
export interface GeographicScope {
  type: 'city' | 'zone' | 'woreda' | 'kebele';
  zoneId?: string;
  woredaId?: string;
  kebeleId?: string;
}

export function canAccessZone(userScope: GeographicScope, zoneId: string): boolean {
  if (userScope.type === 'city') return true;
  if (userScope.type === 'zone') return userScope.zoneId === zoneId;
  return false;
}

export function canAccessWoreda(userScope: GeographicScope, woredaId: string, targetZoneId: string): boolean {
  if (userScope.type === 'city') return true;
  if (userScope.type === 'zone') return userScope.zoneId === targetZoneId;
  if (userScope.type === 'woreda') return userScope.woredaId === woredaId;
  return false;
}

export function canAccessKebele(
  userScope: GeographicScope, 
  kebeleId: string, 
  targetWoredaId: string, 
  targetZoneId: string
): boolean {
  if (userScope.type === 'city') return true;
  if (userScope.type === 'zone') return userScope.zoneId === targetZoneId;
  if (userScope.type === 'woreda') return userScope.woredaId === targetWoredaId;
  if (userScope.type === 'kebele') return userScope.kebeleId === kebeleId;
  return false;
}

export function getScopeDisplayName(scope: GeographicScope): string {
  switch (scope.type) {
    case 'city':
      return 'Addis Ababa (City-wide)';
    case 'zone':
      return `Zone ${scope.zoneId}`;
    case 'woreda':
      return `Woreda ${scope.woredaId}`;
    case 'kebele':
      return `Kebele ${scope.kebeleId}`;
    default:
      return 'Unknown';
  }
}
