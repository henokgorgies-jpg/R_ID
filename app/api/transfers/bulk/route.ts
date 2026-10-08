import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";

type TransferAction = "approve" | "reject" | "complete" | "cancel";

type BulkBody = {
  ids?: string[];
  action?: TransferAction;
  rejectionReason?: string;
};

function transferScopeWhere(user: {
  scope: { type: "city" | "zone" | "woreda" | "kebele"; zoneId?: string; woredaId?: string; kebeleId?: string };
}) {
  if (user.scope.type === "city") return {};
  if (user.scope.type === "zone" && user.scope.zoneId) {
    return { OR: [{ sourceZoneId: user.scope.zoneId }, { destinationZoneId: user.scope.zoneId }] };
  }
  if (user.scope.type === "woreda" && user.scope.woredaId) {
    return { OR: [{ sourceWoredaId: user.scope.woredaId }, { destinationWoredaId: user.scope.woredaId }] };
  }
  if (user.scope.type === "kebele" && user.scope.kebeleId) {
    return { OR: [{ sourceKebeleId: user.scope.kebeleId }, { destinationKebeleId: user.scope.kebeleId }] };
  }
  return { id: "__no_access__" };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as BulkBody;
    const ids = Array.from(new Set((body.ids ?? []).map((id) => id.trim()).filter(Boolean)));
    const action = body.action;

    if (!action || !["approve", "reject", "complete", "cancel"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (ids.length === 0) {
      return NextResponse.json({ error: "No transfer ids provided" }, { status: 400 });
    }

    if (action === "reject" && !hasPermission(auth.user.role, "transfers:reject")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((action === "approve" || action === "complete" || action === "cancel") && !hasPermission(auth.user.role, "transfers:approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed = await db.transfer.findMany({
      where: { id: { in: ids }, ...transferScopeWhere(auth.user) },
      select: { id: true, status: true },
    });
    const allowedIds = allowed.map((t) => t.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ error: "No accessible transfers found" }, { status: 404 });
    }

    const now = new Date();
    let data: Record<string, unknown> = {};

    if (action === "approve") {
      data = {
        status: "approved",
        destinationApprovedBy: auth.user.id,
        destinationApprovedAt: now,
      };
    } else if (action === "reject") {
      data = {
        status: "rejected",
        rejectedBy: auth.user.id,
        rejectedAt: now,
        rejectionReason: body.rejectionReason?.trim() || "Rejected during bulk review",
      };
    } else if (action === "complete") {
      data = {
        status: "completed",
        completedBy: auth.user.id,
        completedAt: now,
      };
    } else if (action === "cancel") {
      data = { status: "cancelled" };
    }

    await db.transfer.updateMany({
      where: { id: { in: allowedIds } },
      data,
    });

    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        action: "update",
        resourceType: "transfer",
        description: `Bulk transfer action executed: ${action}`,
        previousValue: { ids: allowedIds, action },
        newValue: { ids: allowedIds, action },
        timestamp: now,
      },
    });

    return NextResponse.json({ ids: allowedIds, updatedCount: allowedIds.length, action });
  } catch (error) {
    console.error("Failed bulk update transfers:", error);
    return NextResponse.json({ error: "Failed bulk update transfers" }, { status: 500 });
  }
}

