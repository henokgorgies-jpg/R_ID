import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { type Permission } from "@/lib/data/types";
import { hasPermission } from "@/lib/auth/permissions";
import { sessionCookie, verifySessionToken } from "@/lib/auth/session";

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "super_admin" | "zone_admin" | "woreda_admin" | "kebele_admin" | "auditor" | "verification_officer";
  scope: {
    type: "city" | "zone" | "woreda" | "kebele";
    zoneId?: string;
    woredaId?: string;
    kebeleId?: string;
  };
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
};

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function getRequestUser(request: NextRequest | undefined): Promise<AuthenticatedUser | null> {
  if (!request) return null;
  const token = request.cookies.get(sessionCookie.name)?.value;
  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      scopeType: true,
      scopeZoneId: true,
      scopeWoredaId: true,
      scopeKebeleId: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    scope: {
      type: user.scopeType,
      zoneId: user.scopeZoneId ?? undefined,
      woredaId: user.scopeWoredaId ?? undefined,
      kebeleId: user.scopeKebeleId ?? undefined,
    },
    isActive: user.isActive,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function requireAuth(request: NextRequest | undefined): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();
  return { user };
}

export async function requirePermission(
  request: NextRequest | undefined,
  permission: Permission,
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!hasPermission(auth.user.role, permission)) return forbidden();
  return auth;
}

export function canAccessLocation(
  user: AuthenticatedUser,
  location: { zoneId: string; woredaId: string; kebeleId: string },
): boolean {
  if (user.scope.type === "city") return true;
  if (user.scope.type === "zone") return user.scope.zoneId === location.zoneId;
  if (user.scope.type === "woreda") return user.scope.woredaId === location.woredaId;
  if (user.scope.type === "kebele") return user.scope.kebeleId === location.kebeleId;
  return false;
}

export function residentScopeWhere(user: AuthenticatedUser) {
  if (user.scope.type === "city") return {};
  if (user.scope.type === "zone" && user.scope.zoneId) return { zoneId: user.scope.zoneId };
  if (user.scope.type === "woreda" && user.scope.woredaId) return { woredaId: user.scope.woredaId };
  if (user.scope.type === "kebele" && user.scope.kebeleId) return { kebeleId: user.scope.kebeleId };
  return { id: "__no_access__" };
}

export function householdScopeWhere(user: AuthenticatedUser) {
  if (user.scope.type === "city") return {};
  if (user.scope.type === "zone" && user.scope.zoneId) return { zoneId: user.scope.zoneId };
  if (user.scope.type === "woreda" && user.scope.woredaId) return { woredaId: user.scope.woredaId };
  if (user.scope.type === "kebele" && user.scope.kebeleId) return { kebeleId: user.scope.kebeleId };
  return { id: "__no_access__" };
}
