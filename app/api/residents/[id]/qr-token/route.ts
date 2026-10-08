import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";
import { createSignedQrToken } from "@/lib/id-system/qr-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "id:verify");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const resident = await db.resident.findUnique({
      where: { id },
      select: {
        id: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
        idNumber: true,
        idIssuedDate: true,
        idExpiryDate: true,
      },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }
    if (
      !canAccessLocation(auth.user, {
        zoneId: resident.zoneId,
        woredaId: resident.woredaId,
        kebeleId: resident.kebeleId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!resident.idNumber || !resident.idIssuedDate || !resident.idExpiryDate) {
      return NextResponse.json({ error: "Resident has no issued ID" }, { status: 400 });
    }

    const qrToken = createSignedQrToken({
      residentId: resident.id,
      idNumber: resident.idNumber,
      issuedAt: resident.idIssuedDate,
      expiresAt: resident.idExpiryDate,
    });

    return NextResponse.json({ qrToken });
  } catch (error) {
    console.error("Failed to generate resident QR token:", error);
    return NextResponse.json({ error: "Failed to generate QR token" }, { status: 500 });
  }
}

