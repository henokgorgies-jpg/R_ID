import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { verifySignedQrToken } from "@/lib/id-system/qr-token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "id:verify");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ valid: false, error: "QR token is required" }, { status: 400 });
    }

    const verification = verifySignedQrToken(token);
    if (!verification.valid || !verification.claims) {
      return NextResponse.json({ valid: false, error: verification.reason ?? "Invalid token" }, { status: 400 });
    }

    const claims = verification.claims;
    const resident = await db.resident.findUnique({
      where: { id: claims.residentId },
      select: {
        id: true,
        firstName: true,
        fatherName: true,
        grandFatherName: true,
        idNumber: true,
        idStatus: true,
        status: true,
        faceStatus: true,
        faceUpdatedAt: true,
        faceEmbedding: {
          select: {
            modelVersion: true,
            qualityScore: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!resident || resident.idNumber !== claims.idNumber) {
      return NextResponse.json({ valid: false, error: "Resident or ID mismatch" }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      claims: {
        idNumber: claims.idNumber,
        residentId: claims.residentId,
        issuedAt: claims.issuedAt,
        expiresAt: claims.expiresAt,
        jti: claims.jti,
      },
      resident: {
        id: resident.id,
        fullName: `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`,
        idNumber: resident.idNumber,
        idStatus: resident.idStatus,
        status: resident.status,
      },
      face: {
        status: resident.faceStatus,
        updatedAt: resident.faceUpdatedAt,
        modelVersion: resident.faceEmbedding?.modelVersion ?? null,
        qualityScore: resident.faceEmbedding?.qualityScore ?? null,
        embeddingRecordUpdatedAt: resident.faceEmbedding?.updatedAt ?? null,
      },
      verifiedAt: new Date().toISOString(),
      verifiedBy: {
        id: auth.user.id,
        email: auth.user.email,
      },
    });
  } catch (error) {
    console.error("Failed to verify QR token:", error);
    return NextResponse.json({ valid: false, error: "Failed to verify QR token" }, { status: 500 });
  }
}
