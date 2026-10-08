import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { householdScopeWhere, requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

type PatchBody = {
  status?: "active" | "inactive" | "relocated";
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "households:update");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await request.json()) as PatchBody;
    if (!body.status || !["active", "inactive", "relocated"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await db.household.findFirst({
      where: {
        id,
        ...householdScopeWhere(auth.user),
      },
      select: {
        id: true,
        status: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
      },
    });
    if (!existing) return NextResponse.json({ error: "Household not found" }, { status: 404 });

    const updated = await db.household.update({
      where: { id: existing.id },
      data: { status: body.status },
      include: {
        kebele: { select: { id: true, name: true } },
        woreda: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        residents: {
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        action: "update",
        resourceType: "household",
        resourceId: existing.id,
        description: "Updated household status",
        previousValue: { status: existing.status },
        newValue: { status: updated.status },
        zoneId: existing.zoneId,
        woredaId: existing.woredaId,
        kebeleId: existing.kebeleId,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ household: updated });
  } catch (error) {
    console.error("Failed to update household:", error);
    return NextResponse.json({ error: "Failed to update household" }, { status: 500 });
  }
}

