import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { listPaymentAuditEntries } from "@/lib/finance/payment-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:view");
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(request.url);
    const phase = (url.searchParams.get("phase") || "all").toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 25)));

    const entries = await listPaymentAuditEntries(auth.user);
    const filtered = entries.filter((entry) => {
      if (phase === "all") return true;
      return entry.phase === phase;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      transactions: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("Failed to fetch finance transactions:", error);
    return NextResponse.json({ error: "Failed to fetch finance transactions." }, { status: 500 });
  }
}
