import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { householdScopeWhere, requirePermission } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "households:read");
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get("id") ?? "").trim();
    const zoneId = (searchParams.get("zoneId") ?? "").trim();
    const woredaId = (searchParams.get("woredaId") ?? "").trim();
    const kebeleId = (searchParams.get("kebeleId") ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Household id is required" }, { status: 400 });
    }

    const household = await db.household.findFirst({
      where: {
        id,
        ...householdScopeWhere(auth.user),
      },
      select: {
        id: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
      },
    });

    if (!household) {
      return NextResponse.json({ exists: false, inScope: false });
    }

    const inScope =
      !zoneId || !woredaId || !kebeleId
        ? true
        : household.zoneId === zoneId && household.woredaId === woredaId && household.kebeleId === kebeleId;

    return NextResponse.json({
      exists: true,
      inScope,
      household,
    });
  } catch (error) {
    console.error("Failed to validate household:", error);
    return NextResponse.json({ error: "Failed to validate household" }, { status: 500 });
  }
}
