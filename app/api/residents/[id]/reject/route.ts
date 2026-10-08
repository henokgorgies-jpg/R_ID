import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "residents:update");
  if (auth instanceof NextResponse) return auth;
  if (auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can reject registrations" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim();
    if (!reason) return NextResponse.json({ error: "Reject reason is required" }, { status: 400 });

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

    const updated = await db.resident.update({
      where: { id },
      data: {
        status: "suspended",
        idStatus: "revoked",
      },
      select: { id: true, status: true, idStatus: true },
    });

    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        action: "reject",
        resourceType: "resident",
        resourceId: resident.id,
        description: `Rejected resident registration: ${reason}`,
        previousValue: { status: resident.status, idStatus: resident.idStatus },
        newValue: { status: updated.status, idStatus: updated.idStatus, reason },
        zoneId: resident.zoneId,
        woredaId: resident.woredaId,
        kebeleId: resident.kebeleId,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ resident: updated });
  } catch (error) {
    console.error("Failed to reject resident:", error);
    return NextResponse.json({ error: "Failed to reject resident" }, { status: 500 });
  }
}

