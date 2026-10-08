import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getIdPaymentFees, setIdPaymentFees } from "@/lib/payments/fees";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (
    !hasPermission(auth.user.role, "id:generate") &&
    !hasPermission(auth.user.role, "id:reissue") &&
    !hasPermission(auth.user.role, "admin:settings")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const fees = await getIdPaymentFees();
    return NextResponse.json({ fees });
  } catch (error) {
    console.error("Failed to read payment fee settings:", error);
    return NextResponse.json({ error: "Failed to read payment fee settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!hasPermission(auth.user.role, "admin:settings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      initialIssueFeeEtb?: number;
      reissueFeeEtb?: number;
    };

    const initialIssueFeeEtb = Number(body.initialIssueFeeEtb);
    const reissueFeeEtb = Number(body.reissueFeeEtb);
    if (!Number.isFinite(initialIssueFeeEtb) || !Number.isFinite(reissueFeeEtb) || initialIssueFeeEtb <= 0 || reissueFeeEtb <= 0) {
      return NextResponse.json({ error: "Both fee values must be positive numbers." }, { status: 400 });
    }

    const fees = await setIdPaymentFees({
      initialIssueFeeEtb,
      reissueFeeEtb,
    });

    return NextResponse.json({ fees });
  } catch (error) {
    console.error("Failed to update payment fee settings:", error);
    return NextResponse.json({ error: "Failed to update payment fee settings." }, { status: 500 });
  }
}
