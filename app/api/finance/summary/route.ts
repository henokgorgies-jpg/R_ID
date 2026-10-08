import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { listPaymentAuditEntries } from "@/lib/finance/payment-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:view");
  if (auth instanceof NextResponse) return auth;

  try {
    const entries = await listPaymentAuditEntries(auth.user);
    const consumed = entries.filter((entry) => entry.phase === "consumed");
    const now = new Date();

    const totalIncomeEtb = consumed.reduce((sum, entry) => sum + entry.amount, 0);
    const todayIncomeEtb = consumed.reduce((sum, entry) => {
      const ts = new Date(entry.timestamp);
      return sameDay(ts, now) ? sum + entry.amount : sum;
    }, 0);
    const monthIncomeEtb = consumed.reduce((sum, entry) => {
      const ts = new Date(entry.timestamp);
      if (ts.getFullYear() === now.getFullYear() && ts.getMonth() === now.getMonth()) return sum + entry.amount;
      return sum;
    }, 0);

    return NextResponse.json({
      summary: {
        totalIncomeEtb: Number(totalIncomeEtb.toFixed(2)),
        todayIncomeEtb: Number(todayIncomeEtb.toFixed(2)),
        monthIncomeEtb: Number(monthIncomeEtb.toFixed(2)),
        totalTransactions: consumed.length,
        authorizedTransactions: entries.filter((entry) => entry.phase === "authorized").length,
        consumedTransactions: consumed.length,
      },
      recentTransactions: consumed.slice(0, 12),
    });
  } catch (error) {
    console.error("Failed to fetch finance summary:", error);
    return NextResponse.json({ error: "Failed to fetch finance summary." }, { status: 500 });
  }
}
