import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "admin:users");
  if (auth instanceof NextResponse) return auth;

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
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
      },
    });

    return NextResponse.json({
      users: users.map((u: any) => ({
        ...u,
        lastLogin: u.lastLogin?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "admin:users");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: "super_admin" | "zone_admin" | "woreda_admin" | "kebele_admin" | "auditor" | "verification_officer";
      scopeType?: "city" | "zone" | "woreda" | "kebele";
      scopeZoneId?: string | null;
      scopeWoredaId?: string | null;
      scopeKebeleId?: string | null;
      password?: string;
    };

    if (!body.email || !body.firstName || !body.lastName || !body.role || !body.scopeType || !body.password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const email = body.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    const tempPassword = body.password.trim();
    if (tempPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const user = await db.user.create({
      data: {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        email,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        role: body.role,
        scopeType: body.scopeType,
        scopeZoneId: body.scopeZoneId ?? null,
        scopeWoredaId: body.scopeWoredaId ?? null,
        scopeKebeleId: body.scopeKebeleId ?? null,
        isActive: true,
        passwordHash: hashPassword(tempPassword),
      },
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
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
