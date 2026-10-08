import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "residents:update");
  if (auth instanceof NextResponse) return auth;
  if (auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can perform bulk review" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      residentIds?: string[];
      action?: "approve" | "reject" | "auto_reject";
      reason?: string;
    };
    const residentIds = Array.isArray(body.residentIds) ? body.residentIds : [];
    if (residentIds.length === 0) return NextResponse.json({ error: "residentIds are required" }, { status: 400 });
    if (!body.action || !["approve", "reject", "auto_reject"].includes(body.action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (body.action === "reject" && !body.reason?.trim()) {
      return NextResponse.json({ error: "Reject reason is required for bulk reject" }, { status: 400 });
    }

    const residents = await db.resident.findMany({
      where: { id: { in: residentIds } },
      select: { id: true, zoneId: true, woredaId: true, kebeleId: true, status: true, idStatus: true },
    });
    const allowed = residents.filter((r) =>
      canAccessLocation(auth.user, {
        zoneId: r.zoneId,
        woredaId: r.woredaId,
        kebeleId: r.kebeleId,
      }),
    );
    if (allowed.length === 0) return NextResponse.json({ updated: 0 });

    let updatedCount = 0;
    let skippedCount = 0;

    await db.$transaction(async (tx) => {
      for (const r of allowed) {
        if (body.action === "approve") {
          await tx.resident.update({
            where: { id: r.id },
            data: {
              status: "active",
              idStatus: r.idStatus === "pending" ? null : r.idStatus,
            },
          });
          await tx.auditLog.create({
            data: {
              id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              userId: auth.user.id,
              userEmail: auth.user.email,
              userRole: auth.user.role,
              action: "approve",
              resourceType: "resident",
              resourceId: r.id,
              description: "Bulk approved resident registration",
              previousValue: { status: r.status, idStatus: r.idStatus },
              newValue: { status: "active", idStatus: null },
              zoneId: r.zoneId,
              woredaId: r.woredaId,
              kebeleId: r.kebeleId,
              timestamp: new Date(),
            },
          });
          updatedCount += 1;
        } else {
          let rejectReason = body.reason?.trim() || "Rejected by reviewer";
          if (body.action === "auto_reject") {
            const mergedCase = await tx.duplicateCase.findFirst({
              where: {
                status: "merged",
                NOT: { mergedResidentId: r.id },
                OR: [{ resident1Id: r.id }, { resident2Id: r.id }],
              },
              orderBy: { mergedAt: "desc" },
              select: {
                id: true,
                resident1Id: true,
                resident2Id: true,
                overallScore: true,
                scores: true,
                detectedAt: true,
                mergedAt: true,
                mergedResidentId: true,
              },
            });

            if (!mergedCase) {
              skippedCount += 1;
              continue;
            }

            const retainedResidentId = mergedCase.mergedResidentId ?? (
              mergedCase.resident1Id === r.id ? mergedCase.resident2Id : mergedCase.resident1Id
            );
            const faceScore = (mergedCase.scores as any)?.faceScore ?? "n/a";
            rejectReason = `Auto-rejected after duplicate merge case ${mergedCase.id}: resident ${r.id} was not the retained record. Kept resident ${retainedResidentId} (overall ${mergedCase.overallScore}, face ${faceScore}); match detected on ${mergedCase.detectedAt.toISOString()} and merged on ${mergedCase.mergedAt?.toISOString() ?? "unknown date"}`;
          }

          await tx.resident.update({
            where: { id: r.id },
            data: { status: "suspended", idStatus: "revoked" },
          });
          await tx.auditLog.create({
            data: {
              id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              userId: auth.user.id,
              userEmail: auth.user.email,
              userRole: auth.user.role,
              action: "reject",
              resourceType: "resident",
              resourceId: r.id,
              description:
                body.action === "auto_reject"
                  ? `Auto-rejected resident registration: ${rejectReason}`
                  : `Bulk rejected resident registration: ${rejectReason}`,
              previousValue: { status: r.status, idStatus: r.idStatus },
              newValue: { status: "suspended", idStatus: "revoked", reason: rejectReason, mode: body.action },
              zoneId: r.zoneId,
              woredaId: r.woredaId,
              kebeleId: r.kebeleId,
              timestamp: new Date(),
            },
          });
          updatedCount += 1;
        }
      }
    });

    return NextResponse.json({ updated: updatedCount, skipped: skippedCount });
  } catch (error) {
    console.error("Bulk review failed:", error);
    return NextResponse.json({ error: "Bulk review failed" }, { status: 500 });
  }
}
