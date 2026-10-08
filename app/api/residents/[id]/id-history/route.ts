import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "id:generate");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const resident = await db.resident.findUnique({
      where: { id },
      select: { id: true, zoneId: true, woredaId: true, kebeleId: true },
    });
    if (!resident) return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    if (
      !canAccessLocation(auth.user, {
        zoneId: resident.zoneId,
        woredaId: resident.woredaId,
        kebeleId: resident.kebeleId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const events = await db.$queryRaw<
      Array<{
        id: string;
        description: string;
        timestamp: Date | string;
        userEmail: string;
        newValue: unknown;
        previousValue: unknown;
      }>
    >`
      SELECT
        a.id,
        a.description,
        a.timestamp,
        a."userEmail",
        a."newValue",
        a."previousValue"
      FROM "AuditLog" a
      WHERE a."resourceType"::text = 'id_card'
        AND a."resourceId" = ${id}
        AND a.action::text IN ('generate_id', 'payment')
      ORDER BY a.timestamp DESC
    `;

    return NextResponse.json({
      history: events.map((e) => ({
        id: e.id,
        description: e.description,
        performedBy: e.userEmail,
        timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : new Date(e.timestamp).toISOString(),
        newValue: e.newValue,
        previousValue: e.previousValue,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch ID history:", error);
    return NextResponse.json({ error: "Failed to fetch ID history" }, { status: 500 });
  }
}
