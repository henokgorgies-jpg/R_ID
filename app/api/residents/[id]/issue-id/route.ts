import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";
import { validateIDFormat } from "@/lib/id-system/id-generator";
import { createSignedQrToken } from "@/lib/id-system/qr-token";
import {
  EthioPayError,
  EthioPayTransaction,
  getEthioPayMerchantTransaction,
} from "@/lib/payments/ethiopay";
import { getIdPaymentFees } from "@/lib/payments/fees";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "id:generate");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { idNumber, idIssuedDate, idExpiryDate, reissue } = body as {
      idNumber?: string;
      idIssuedDate?: string;
      idExpiryDate?: string;
      reissue?: boolean;
      paymentReference?: string;
    };

    if (!idNumber || !idIssuedDate || !idExpiryDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const formatCheck = validateIDFormat(idNumber);
    if (!formatCheck.isValid) {
      return NextResponse.json({ error: "Invalid ID format", details: formatCheck.errors }, { status: 400 });
    }

    const resident = await db.resident.findUnique({
      where: { id },
      select: {
        id: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
        status: true,
        idNumber: true,
        idIssuedDate: true,
        idExpiryDate: true,
      },
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
    if (resident.status !== "active") {
      return NextResponse.json(
        { error: "Resident registration is pending approval. Super admin approval is required before ID generation." },
        { status: 400 },
      );
    }
    if (resident.idNumber && !reissue) {
      return NextResponse.json(
        { error: "ID already generated. Use reissue flow instead of generate." },
        { status: 400 },
      );
    }

    const duplicate = await db.resident.findFirst({
      where: {
        idNumber,
        id: { not: id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "ID number already exists. Please generate a new ID number and try again." },
        { status: 409 },
      );
    }

    const mode = resident.idNumber ? "reissue" : "initial_issue";
    const fees = await getIdPaymentFees();
    const requiredAmount = mode === "reissue" ? fees.reissueFeeEtb : fees.initialIssueFeeEtb;
    const paymentReference = (body?.paymentReference ?? "").toString().trim();
    if (!paymentReference) {
      return NextResponse.json({ error: "EthioPay payment reference is required." }, { status: 400 });
    }

    const existingPaymentLogs = await db.$queryRaw<
      Array<{
        resourceId: string;
        newValue: unknown;
      }>
    >`
      SELECT a."resourceId", a."newValue"
      FROM "AuditLog" a
      WHERE a.action::text = 'payment'
        AND a."resourceType"::text = 'id_card'
        AND (a."newValue"->>'reference') = ${paymentReference}
      ORDER BY a.timestamp DESC
    `;

    const consumedReferenceLog = existingPaymentLogs.find((log) => {
      const value = log.newValue as { phase?: string } | null;
      return value?.phase === "consumed";
    });
    if (consumedReferenceLog && consumedReferenceLog.resourceId !== resident.id) {
      return NextResponse.json({ error: "Payment reference already used for another resident." }, { status: 409 });
    }
    if (consumedReferenceLog && consumedReferenceLog.resourceId === resident.id) {
      const current = await db.resident.findUnique({
        where: { id },
        select: { id: true, idNumber: true, idStatus: true, idIssuedDate: true, idExpiryDate: true },
      });
      if (!current?.idNumber || !current.idIssuedDate || !current.idExpiryDate) {
        return NextResponse.json({ error: "Payment already consumed but issuance state is incomplete." }, { status: 409 });
      }
      const existingQrToken = createSignedQrToken({
        residentId: current.id,
        idNumber: current.idNumber,
        issuedAt: current.idIssuedDate,
        expiresAt: current.idExpiryDate,
      });
      return NextResponse.json({ ...current, qrToken: existingQrToken });
    }

    const mockPaymentLog = existingPaymentLogs.find((log) => {
      const value = log.newValue as { provider?: string; residentId?: string } | null;
      return value?.provider === "mock" && value?.residentId === resident.id;
    });
    const paymentTx: EthioPayTransaction = mockPaymentLog
      ? (() => {
          const value = mockPaymentLog.newValue as {
            amount?: number;
            currency?: string;
            method?: string;
            status?: string;
          };
          return {
            transactionRef: paymentReference,
            amount: Number(value.amount ?? 0),
            currency: (value.currency ?? "ETB").toUpperCase(),
            paymentMethod: value.method ?? "mock_card",
            status: (value.status ?? "completed").toLowerCase(),
          };
        })()
      : await getEthioPayMerchantTransaction(paymentReference);
    if (paymentTx.status !== "completed") {
      return NextResponse.json(
        { error: "Payment is not completed yet. Complete EthioPay payment before issuing ID." },
        { status: 402 },
      );
    }
    if (paymentTx.currency !== "ETB") {
      return NextResponse.json({ error: "Payment currency must be ETB." }, { status: 400 });
    }
    if (!Number.isFinite(paymentTx.amount) || paymentTx.amount < requiredAmount) {
      return NextResponse.json(
        {
          error:
            mode === "reissue"
              ? `Insufficient payment. Reissue requires at least ${fees.reissueFeeEtb} ETB.`
              : `Insufficient payment. Initial issuance requires at least ${fees.initialIssueFeeEtb} ETB.`,
        },
        { status: 400 },
      );
    }

    const issuedAtDate = new Date(idIssuedDate);
    const expiryAtDate = new Date(idExpiryDate);
    const qrToken = createSignedQrToken({
      residentId: id,
      idNumber,
      issuedAt: issuedAtDate,
      expiresAt: expiryAtDate,
    });

    const updated = await db.$transaction(async (tx) => {
      const updatedResident = await tx.resident.update({
        where: { id },
        data: {
          idNumber,
          idStatus: resident.idNumber ? "reissued" : "active",
          idIssuedDate: issuedAtDate,
          idExpiryDate: expiryAtDate,
        },
        select: { id: true, idNumber: true, idStatus: true, idIssuedDate: true, idExpiryDate: true },
      });

      await tx.auditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: auth.user.id,
          userEmail: auth.user.email,
          userRole: auth.user.role,
          action: "generate_id",
          resourceType: "id_card",
          resourceId: resident.id,
          description: resident.idNumber ? "Reissued resident ID card" : "Generated resident ID card",
          previousValue: resident.idNumber
            ? {
                idNumber: resident.idNumber,
                idIssuedDate: resident.idIssuedDate,
                idExpiryDate: resident.idExpiryDate,
              }
            : undefined,
          newValue: {
            idNumber,
            idIssuedDate,
            idExpiryDate,
            mode,
            paymentReference: paymentTx.transactionRef,
          },
          zoneId: resident.zoneId,
          woredaId: resident.woredaId,
          kebeleId: resident.kebeleId,
          timestamp: new Date(),
        },
      });

      // Use raw SQL to support legacy enum values present in DB even if generated Prisma enum is stale.
      await tx.$executeRaw`
        INSERT INTO "AuditLog" (
          id, "userId", "userEmail", "userRole", action, "resourceType", "resourceId", description,
          "previousValue", "newValue", "zoneId", "woredaId", "kebeleId", timestamp
        ) VALUES (
          ${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`},
          ${auth.user.id},
          ${auth.user.email},
          ${auth.user.role}::"UserRole",
          'payment'::"AuditAction",
          'id_card'::"ResourceType",
          ${resident.id},
          ${mode === "reissue" ? "Recorded EthioPay payment for ID reissue" : "Recorded EthioPay payment for ID generation"},
          NULL,
          ${{
            amount: paymentTx.amount,
            currency: paymentTx.currency,
            method: paymentTx.paymentMethod || "card",
            provider: "ethiopay",
            reference: paymentTx.transactionRef,
            status: paymentTx.status,
            phase: "consumed",
            mode,
            idNumber,
          }}::jsonb,
          ${resident.zoneId},
          ${resident.woredaId},
          ${resident.kebeleId},
          NOW()
        )
      `;

      return updatedResident;
    });

    if (!updated.idNumber || !updated.idIssuedDate || !updated.idExpiryDate) {
      return NextResponse.json({ error: "Failed to build QR payload from issued ID" }, { status: 500 });
    }

    return NextResponse.json({ ...updated, qrToken });
  } catch (error: any) {
    if (error instanceof EthioPayError) {
      return NextResponse.json(
        { error: error.message, code: error.code || "ETHIOPAY_ERROR" },
        { status: error.statusCode || 500 },
      );
    }
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "ID number already exists. Please generate a new ID number and try again." },
        { status: 409 },
      );
    }
    console.error("Failed to issue ID:", error);
    return NextResponse.json({ error: "Failed to issue ID" }, { status: 500 });
  }
}
