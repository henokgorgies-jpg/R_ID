import { NextRequest, NextResponse } from "next/server";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";
import {
  createMockEthioPayCharge,
  createEthioPayCharge,
  EthioPayError,
  IdPaymentMode,
} from "@/lib/payments/ethiopay";
import { db } from "@/lib/db";
import { getIdPaymentFees } from "@/lib/payments/fees";

export const runtime = "nodejs";

type ChargeRequestBody = {
  residentId?: string;
  mode?: IdPaymentMode;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
};

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "id:generate");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as ChargeRequestBody;
    const residentId = body.residentId?.trim();
    const mode = body.mode;

    if (!residentId || (mode !== "initial_issue" && mode !== "reissue")) {
      return NextResponse.json({ error: "Invalid payment request payload." }, { status: 400 });
    }

    const cardNumber = body.cardNumber?.trim().replace(/\s+/g, "");
    const expiryDate = body.expiryDate?.trim();
    const cvv = body.cvv?.trim();
    const cardholderName = body.cardholderName?.trim() || undefined;
    if (mode === "reissue" && (!cardNumber || !expiryDate || !cvv)) {
      return NextResponse.json({ error: "Card number, expiry date, and CVV are required." }, { status: 400 });
    }

    const resident = await db.resident.findUnique({
      where: { id: residentId },
      select: {
        id: true,
        firstName: true,
        fatherName: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
        status: true,
        idNumber: true,
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
    if (resident.status !== "active") {
      return NextResponse.json({ error: "Resident must be active before payment and ID issuance." }, { status: 400 });
    }
    if (mode === "initial_issue" && resident.idNumber) {
      return NextResponse.json({ error: "Initial issue payment is not allowed once an ID already exists." }, { status: 400 });
    }
    if (mode === "reissue" && !resident.idNumber) {
      return NextResponse.json({ error: "Reissue payment requires an existing ID." }, { status: 400 });
    }

    const fees = await getIdPaymentFees();
    const amount = mode === "reissue" ? fees.reissueFeeEtb : fees.initialIssueFeeEtb;
    const externalReference = `kebele-id:${mode}:${resident.id}:${Date.now()}`;
    const description =
      mode === "reissue"
        ? `Kebele ID reissue payment for ${resident.firstName} ${resident.fatherName}`
        : `Kebele ID generation payment for ${resident.firstName} ${resident.fatherName}`;

    const transaction = mode === "initial_issue"
      ? createMockEthioPayCharge({ amount, currency: "ETB" })
      : await createEthioPayCharge({
          amount,
          currency: "ETB",
          externalReference,
          description,
          cardNumber: cardNumber ?? "",
          expiryDate: expiryDate ?? "",
          cvv: cvv ?? "",
          cardholderName,
          metadata: {
            residentId: resident.id,
            mode,
            kebeleId: resident.kebeleId,
          },
        });

    // Track payment authorization before issuance so operators can reconcile retries.
    await db.$executeRaw`
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
        ${mode === "reissue" ? "Authorized EthioPay payment for ID reissue" : "Authorized EthioPay payment for ID generation"},
        NULL,
        ${{
          amount: transaction.amount,
          currency: transaction.currency,
          method: transaction.paymentMethod || "card",
          provider: mode === "initial_issue" ? "mock" : "ethiopay",
          reference: transaction.transactionRef,
          status: transaction.status,
          phase: "authorized",
          mode,
          residentId: resident.id,
        }}::jsonb,
        ${resident.zoneId},
        ${resident.woredaId},
        ${resident.kebeleId},
        NOW()
      )
    `;

    return NextResponse.json({ transaction });
  } catch (error) {
    if (error instanceof EthioPayError) {
      return NextResponse.json(
        { error: error.message, code: error.code || "ETHIOPAY_ERROR" },
        { status: error.statusCode || 500 },
      );
    }
    console.error("EthioPay charge failed:", error);
    return NextResponse.json({ error: "Failed to process EthioPay charge." }, { status: 500 });
  }
}
