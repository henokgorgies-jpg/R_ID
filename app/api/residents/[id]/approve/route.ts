import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "residents:update");
  if (auth instanceof NextResponse) return auth;
  if (auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can approve residents" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const resident = await db.resident.findUnique({
      where: { id },
      select: { id: true, zoneId: true, woredaId: true, kebeleId: true, status: true, idStatus: true },
    });
    if (!resident) return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    if (
      !canAccessLocation(auth.user, {
        zoneId: resident.zoneId,
        woredaId: resident.woredaId,
        kebeleId: resident.kebeleId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const approved = await db.resident.update({
      where: { id },
      data: {
        status: "active",
        idStatus: resident.idStatus === "pending" ? null : resident.idStatus,
      },
      select: {
        id: true,
        status: true,
        idStatus: true,
      },
    });

    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        action: "approve",
        resourceType: "resident",
        resourceId: resident.id,
        description: "Approved resident registration",
        previousValue: { status: resident.status, idStatus: resident.idStatus },
        newValue: { status: approved.status, idStatus: approved.idStatus },
        zoneId: resident.zoneId,
        woredaId: resident.woredaId,
        kebeleId: resident.kebeleId,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ resident: approved });
  } catch (error) {
    console.error("Failed to approve resident:", error);
    return NextResponse.json({ error: "Failed to approve resident" }, { status: 500 });
  }
}

