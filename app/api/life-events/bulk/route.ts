import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, residentScopeWhere } from "@/lib/auth/server";

export const runtime = "nodejs";

type BulkBody = {
  ids?: string[];
  action?: "verify" | "unverify";
};

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "events:update");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as BulkBody;
    const ids = Array.from(new Set((body.ids ?? []).map((id) => id.trim()).filter(Boolean)));
    const action = body.action;

    if (!action || (action !== "verify" && action !== "unverify")) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const allowedEvents = await db.lifeEvent.findMany({
      where: {
        id: { in: ids },
        resident: { is: residentScopeWhere(auth.user) },
      },
      select: { id: true, verifiedAt: true, verifiedBy: true },
    });
    const allowedIds = allowedEvents.map((event) => event.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ error: "No accessible life events found" }, { status: 404 });
    }

    const updateData =
      action === "verify"
        ? { verifiedAt: new Date(), verifiedBy: auth.user.id }
        : { verifiedAt: null, verifiedBy: null };

    await db.lifeEvent.updateMany({
      where: { id: { in: allowedIds } },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        action: "update",
        resourceType: "life_event",
        description: `Bulk ${action} on life events`,
        previousValue: {
          ids: allowedIds,
          action,
        },
        newValue: {
          ids: allowedIds,
          action,
        },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ updatedCount: allowedIds.length, ids: allowedIds, action });
  } catch (error) {
    console.error("Failed bulk update life events:", error);
    return NextResponse.json({ error: "Failed bulk update life events" }, { status: 500 });
  }
}

