import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";

type TransferAction = "approve" | "reject" | "complete" | "cancel";

type PatchBody = {
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await request.json()) as PatchBody;
    const action = body.action;
    if (!action || !["approve", "reject", "complete", "cancel"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "reject" && !hasPermission(auth.user.role, "transfers:reject")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((action === "approve" || action === "complete" || action === "cancel") && !hasPermission(auth.user.role, "transfers:approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await db.transfer.findFirst({
      where: {
        id,
        ...transferScopeWhere(auth.user),
      },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
      },
    });
    if (!existing) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });

    const now = new Date();
    let data: Record<string, unknown> = {};

    if (action === "approve") {
      data = {
        status: "approved",
        sourceApprovedBy: existing.status === "submitted" ? auth.user.id : undefined,
        sourceApprovedAt: existing.status === "submitted" ? now : undefined,
        destinationApprovedBy: auth.user.id,
        destinationApprovedAt: now,
      };
    } else if (action === "reject") {
      data = {
        status: "rejected",
        rejectedBy: auth.user.id,
        rejectedAt: now,
        rejectionReason: body.rejectionReason?.trim() || "Rejected during transfer review",
      };
    } else if (action === "complete") {
      data = {
        status: "completed",
        completedBy: auth.user.id,
        completedAt: now,
      };
    } else if (action === "cancel") {
      data = {
        status: "cancelled",
      };
    }

    const updated = await db.transfer.update({
      where: { id: existing.id },
      data,
      include: {
        resident: { select: { id: true, firstName: true, fatherName: true, grandFatherName: true, idNumber: true } },
        sourceKebele: { select: { id: true, name: true } },
        destinationKebele: { select: { id: true, name: true } },
        initiatedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        action: action === "reject" ? "reject" : action === "approve" ? "approve" : "update",
        resourceType: "transfer",
        resourceId: existing.id,
        description: `Transfer action executed: ${action}`,
        previousValue: { status: existing.status, rejectionReason: existing.rejectionReason },
        newValue: { status: updated.status, rejectionReason: updated.rejectionReason },
        zoneId: updated.sourceZoneId,
        woredaId: updated.sourceWoredaId,
        kebeleId: updated.sourceKebeleId,
        timestamp: now,
      },
    });

    return NextResponse.json({ transfer: updated });
  } catch (error) {
    console.error("Failed to update transfer:", error);
    return NextResponse.json({ error: "Failed to update transfer" }, { status: 500 });
  }
}

