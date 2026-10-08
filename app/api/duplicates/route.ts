import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "duplicates:review");
  if (auth instanceof NextResponse) return auth;

  try {
    const where = duplicateScopeWhere(auth.user);
    const duplicates = await db.duplicateCase.findMany({
      where,
      include: {
        resident1: {
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            registrationDate: true,
            createdAt: true,
            registeredByUser: { select: { firstName: true, lastName: true } },
            faceStatus: true,
            faceEmbedding: { select: { qualityScore: true } },
          },
        },
        resident2: {
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            registrationDate: true,
            createdAt: true,
            registeredByUser: { select: { firstName: true, lastName: true } },
            faceStatus: true,
            faceEmbedding: { select: { qualityScore: true } },
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        userStates: {
          where: { userId: auth.user.id },
          select: {
            snoozedUntil: true,
            snoozedAt: true,
          },
          take: 1,
        },
      },
      orderBy: [{ priority: "desc" }, { detectedAt: "desc" }],
    });

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("Failed to fetch duplicates:", error);
    return NextResponse.json({ error: "Failed to fetch duplicates" }, { status: 500 });
  }
}
