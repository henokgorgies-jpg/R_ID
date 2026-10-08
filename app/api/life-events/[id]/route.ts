import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, residentScopeWhere } from "@/lib/auth/server";

export const runtime = "nodejs";

type PatchBody = {
  notes?: string;
  verified?: boolean;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "events:update");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await request.json()) as PatchBody;
    const scopeWhere = residentScopeWhere(auth.user);

    const existing = await db.lifeEvent.findFirst({
      where: {
        id,
        resident: { is: scopeWhere },
      },
      select: {
        id: true,
        residentId: true,
        eventType: true,
        notes: true,
        verifiedAt: true,
        verifiedBy: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Life event not found" }, { status: 404 });
    }

    const data: {
      notes?: string | null;
      verifiedAt?: Date | null;
      verifiedBy?: string | null;
    } = {};

    if (typeof body.notes === "string") {
      const trimmed = body.notes.trim();
      data.notes = trimmed.length > 0 ? trimmed : null;
    }
    if (typeof body.verified === "boolean") {
      if (body.verified) {
        data.verifiedAt = new Date();
        data.verifiedBy = auth.user.id;
      } else {
        data.verifiedAt = null;
        data.verifiedBy = null;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
    }

    const updated = await db.lifeEvent.update({
      where: { id: existing.id },
      data,
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
          },
        },
        registeredByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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
        resourceType: "life_event",
        resourceId: existing.id,
        description: "Updated life event details",
        previousValue: {
          notes: existing.notes,
          verifiedAt: existing.verifiedAt,
          verifiedBy: existing.verifiedBy,
        },
        newValue: {
          notes: updated.notes,
          verifiedAt: updated.verifiedAt,
          verifiedBy: updated.verifiedBy,
        },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error("Failed to update life event:", error);
    return NextResponse.json({ error: "Failed to update life event" }, { status: 500 });
  }
}

