import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

type DecisionAction = "confirmed_duplicate" | "not_duplicate" | "merge";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "duplicates:review");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      action?: DecisionAction;
      reviewNotes?: string;
      mergedResidentId?: string;
    };

    const action = body.action;
    const reviewNotes = body.reviewNotes?.trim();
    if (!action || !["confirmed_duplicate", "not_duplicate", "merge"].includes(action)) {
      return NextResponse.json({ error: "Invalid decision action" }, { status: 400 });
    }
    if (!reviewNotes) {
      return NextResponse.json({ error: "Review notes are required" }, { status: 400 });
    }
    if (action === "merge") {
      const mergeAuth = await requirePermission(request, "duplicates:merge");
      if (mergeAuth instanceof NextResponse) return mergeAuth;
    }

    const duplicate = await db.duplicateCase.findUnique({
      where: { id },
      select: {
        id: true,
        resident1Id: true,
        resident2Id: true,
        status: true,
        decision: true,
        priority: true,
        overallScore: true,
      },
    });
    if (!duplicate) {
      return NextResponse.json({ error: "Duplicate case not found" }, { status: 404 });
    }
    if (duplicate.status === "merged") {
      return NextResponse.json({ error: "Resolved duplicate cases are read-only" }, { status: 409 });
    }

    let status: "confirmed_duplicate" | "not_duplicate" | "merged" = "not_duplicate";
    let decision: "merge" | "keep_both" | "flag_for_audit" = "keep_both";
    let mergedResidentId: string | null = null;

    if (action === "confirmed_duplicate") {
      status = "confirmed_duplicate";
      decision = "flag_for_audit";
    }
    if (action === "not_duplicate") {
      status = "not_duplicate";
      decision = "keep_both";
    }
    if (action === "merge") {
      status = "merged";
      decision = "merge";
      const selectedMergeId = body.mergedResidentId?.trim();
      if (!selectedMergeId || ![duplicate.resident1Id, duplicate.resident2Id].includes(selectedMergeId)) {
        return NextResponse.json(
          { error: "For merge, mergedResidentId must be one of the case residents" },
          { status: 400 },
        );
      }
      mergedResidentId = selectedMergeId;
    }

    const updated = await db.duplicateCase.update({
      where: { id: duplicate.id },
      data: {
        status,
        decision,
        reviewedBy: auth.user.id,
        reviewedAt: new Date(),
        reviewNotes,
        mergedResidentId,
        mergedAt: action === "merge" ? new Date() : null,
      },
      select: {
        id: true,
        status: true,
        decision: true,
        reviewedAt: true,
        mergedResidentId: true,
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
        description: `Manual duplicate decision: ${action}`,
        previousValue: {
          status: duplicate.status,
          decision: duplicate.decision,
        },
        newValue: {
          status: updated.status,
          decision: updated.decision,
          reviewNotes,
          mergedResidentId: updated.mergedResidentId,
        },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ duplicate: updated });
  } catch (error) {
    console.error("Failed to apply duplicate decision:", error);
    return NextResponse.json({ error: "Failed to apply duplicate decision" }, { status: 500 });
  }
}
