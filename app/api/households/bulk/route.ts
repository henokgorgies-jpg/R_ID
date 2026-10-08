import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { householdScopeWhere, requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

type BulkBody = {
  ids?: string[];
  status?: "active" | "inactive" | "relocated";
};

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "households:update");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as BulkBody;
    const ids = Array.from(new Set((body.ids ?? []).map((id) => id.trim()).filter(Boolean)));
    const status = body.status;

    if (!status || !["active", "inactive", "relocated"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (ids.length === 0) {
      return NextResponse.json({ error: "No household ids provided" }, { status: 400 });
    }

    const allowed = await db.household.findMany({
      where: {
        id: { in: ids },
        ...householdScopeWhere(auth.user),
      },
      select: { id: true },
    });
    const allowedIds = allowed.map((household) => household.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ error: "No accessible households found" }, { status: 404 });
    }

    await db.household.updateMany({
      where: { id: { in: allowedIds } },
      data: { status },
    });

    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        action: "update",
        resourceType: "household",
        description: "Bulk updated household status",
        previousValue: { ids: allowedIds },
        newValue: { ids: allowedIds, status },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ ids: allowedIds, updatedCount: allowedIds.length, status });
  } catch (error) {
    console.error("Failed to bulk update households:", error);
    return NextResponse.json({ error: "Failed to bulk update households" }, { status: 500 });
  }
}

