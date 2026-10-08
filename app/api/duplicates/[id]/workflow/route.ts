import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

type WorkflowAction = "snooze" | "escalate" | "assign";

function duplicateScopeWhere(user: { scope: { type: "city" | "zone" | "woreda" | "kebele"; zoneId?: string; woredaId?: string; kebeleId?: string } }) {
  if (user.scope.type === "city") return {};
  if (user.scope.type === "zone" && user.scope.zoneId) {
    return {
      OR: [
        { resident1: { zoneId: user.scope.zoneId } },
        { resident2: { zoneId: user.scope.zoneId } },
      ],
    };
  }
  if (user.scope.type === "woreda" && user.scope.woredaId) {
    return {
      OR: [
        { resident1: { woredaId: user.scope.woredaId } },
        { resident2: { woredaId: user.scope.woredaId } },
      ],
    };
  }
  if (user.scope.type === "kebele" && user.scope.kebeleId) {
    return {
      OR: [
        { resident1: { kebeleId: user.scope.kebeleId } },
        { resident2: { kebeleId: user.scope.kebeleId } },
      ],
    };
  }
  return { id: "__no_access__" };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "duplicates:review");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      action?: WorkflowAction;
      snoozeHours?: number;
      assignedTo?: string | null;
    };

    const action = body.action;
    if (!action || !["snooze", "escalate", "assign"].includes(action)) {
      return NextResponse.json({ error: "Invalid workflow action" }, { status: 400 });
    }

    const duplicate = await db.duplicateCase.findFirst({
      where: {
        id,
        ...duplicateScopeWhere(auth.user),
      },
      select: {
        id: true,
        status: true,
        assignedTo: true,
        assignedAt: true,
        escalated: true,
        escalatedAt: true,
        escalatedBy: true,
      },
    });

    if (!duplicate) {
      return NextResponse.json({ error: "Duplicate case not found" }, { status: 404 });
    }
    if (duplicate.status === "merged" || duplicate.status === "not_duplicate") {
      return NextResponse.json({ error: "Resolved duplicate cases are read-only" }, { status: 409 });
    }

    if (action === "snooze") {
      const snoozeHours = Number(body.snoozeHours ?? 24);
      if (!Number.isFinite(snoozeHours) || snoozeHours <= 0) {
        return NextResponse.json({ error: "snoozeHours must be a positive number" }, { status: 400 });
      }

      const snoozedUntil = new Date(Date.now() + snoozeHours * 60 * 60 * 1000);
      const userState = await db.duplicateCaseUserState.upsert({
        where: {
          duplicateCaseId_userId: {
            duplicateCaseId: duplicate.id,
            userId: auth.user.id,
          },
        },
        create: {
          id: `dup-state-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          duplicateCaseId: duplicate.id,
          userId: auth.user.id,
          snoozedAt: new Date(),
          snoozedUntil,
        },
        update: {
          snoozedAt: new Date(),
          snoozedUntil,
        },
        select: {
          duplicateCaseId: true,
          userId: true,
          snoozedAt: true,
          snoozedUntil: true,
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: auth.user.id,
          userEmail: auth.user.email,
          userRole: auth.user.role,
          action: "update",
          resourceType: "duplicate",
          resourceId: duplicate.id,
          description: `Duplicate case snoozed for ${snoozeHours} hour(s)`,
          previousValue: {},
          newValue: {
            snoozedAt: userState.snoozedAt,
            snoozedUntil: userState.snoozedUntil,
            userId: auth.user.id,
          },
          timestamp: new Date(),
        },
      });

      return NextResponse.json({ ok: true, action, userState });
    }

    if (action === "escalate") {
      const updated = await db.duplicateCase.update({
        where: { id: duplicate.id },
        data: {
          status: duplicate.status === "pending_review" ? "flagged" : undefined,
          escalated: true,
          escalatedAt: new Date(),
          escalatedBy: auth.user.id,
        },
        select: {
          id: true,
          status: true,
          escalated: true,
          escalatedAt: true,
          escalatedBy: true,
        },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: auth.user.id,
          userEmail: auth.user.email,
          userRole: auth.user.role,
          action: "update",
          resourceType: "duplicate",
          resourceId: duplicate.id,
          description: "Duplicate case escalated",
          previousValue: {
            status: duplicate.status,
            escalated: duplicate.escalated,
            escalatedAt: duplicate.escalatedAt,
            escalatedBy: duplicate.escalatedBy,
          },
          newValue: {
            status: updated.status,
            escalated: updated.escalated,
            escalatedAt: updated.escalatedAt,
            escalatedBy: updated.escalatedBy,
          },
          timestamp: new Date(),
        },
      });

      return NextResponse.json({ ok: true, action, duplicate: updated });
    }

    const assignedTo = body.assignedTo?.trim() || null;
    const updated = await db.duplicateCase.update({
      where: { id: duplicate.id },
      data: {
        assignedTo,
        assignedAt: assignedTo ? new Date() : null,
      },
      select: {
        id: true,
        assignedTo: true,
        assignedAt: true,
        assignee: {
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
        resourceType: "duplicate",
        resourceId: duplicate.id,
        description: assignedTo ? "Duplicate case assigned" : "Duplicate case unassigned",
        previousValue: {
          assignedTo: duplicate.assignedTo,
          assignedAt: duplicate.assignedAt,
        },
        newValue: {
          assignedTo: updated.assignedTo,
          assignedAt: updated.assignedAt,
        },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ ok: true, action, duplicate: updated });
  } catch (error) {
    console.error("Failed duplicate workflow action:", error);
    return NextResponse.json({ error: "Failed duplicate workflow action" }, { status: 500 });
  }
}
