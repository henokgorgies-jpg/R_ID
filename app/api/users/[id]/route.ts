import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function generateTemporaryPassword() {
  return `Tmp#${Math.random().toString(36).slice(2, 10)}A1`;
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "admin:users");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      isActive?: boolean;
      resetPassword?: boolean;
      firstName?: string;
      lastName?: string;
      role?: "super_admin" | "zone_admin" | "woreda_admin" | "kebele_admin" | "auditor" | "verification_officer";
      scopeType?: "city" | "zone" | "woreda" | "kebele";
      scopeZoneId?: string | null;
      scopeWoredaId?: string | null;
      scopeKebeleId?: string | null;
    };

    const data: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.firstName) data.firstName = body.firstName.trim();
    if (body.lastName) data.lastName = body.lastName.trim();
    if (body.role) data.role = body.role;
    if (body.scopeType) data.scopeType = body.scopeType;
    if (body.scopeZoneId !== undefined) data.scopeZoneId = body.scopeZoneId;
    if (body.scopeWoredaId !== undefined) data.scopeWoredaId = body.scopeWoredaId;
    if (body.scopeKebeleId !== undefined) data.scopeKebeleId = body.scopeKebeleId;
    if (body.firstName !== undefined && !body.firstName.trim()) {
      return NextResponse.json({ error: "First name cannot be empty" }, { status: 400 });
    }
    if (body.lastName !== undefined && !body.lastName.trim()) {
      return NextResponse.json({ error: "Last name cannot be empty" }, { status: 400 });
    }

    let temporaryPassword: string | null = null;
    if (body.resetPassword) {
      temporaryPassword = generateTemporaryPassword();
      data.passwordHash = hashPassword(temporaryPassword);
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data,
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

    return NextResponse.json({ user, temporaryPassword });
  } catch (error) {
    console.error("Failed to update user:", error);
    if (error instanceof Error && error.message.toLowerCase().includes("record to update not found")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
