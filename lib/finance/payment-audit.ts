import { canAccessLocation, type AuthenticatedUser } from "@/lib/auth/server";
import { db } from "@/lib/db";

export type PaymentAuditEntry = {
  id: string;
  residentId: string;
  description: string;
  performedBy: string;
  timestamp: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  reference: string;
  status: string;
  phase: string;
  mode: string;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
};

export async function listPaymentAuditEntries(user: AuthenticatedUser): Promise<PaymentAuditEntry[]> {
  const logs = await db.$queryRaw<
    Array<{
      id: string;
      resourceId: string;
      description: string;
      userEmail: string;
      timestamp: Date | string;
      newValue: unknown;
      zoneId: string | null;
      woredaId: string | null;
      kebeleId: string | null;
    }>
  >`
    SELECT
      a.id,
      a."resourceId",
      a.description,
      a."userEmail",
      a.timestamp,
      a."newValue",
      a."zoneId",
      a."woredaId",
      a."kebeleId"
    FROM "AuditLog" a
    WHERE a.action::text = 'payment'
      AND a."resourceType"::text = 'id_card'
    ORDER BY a.timestamp DESC
  `;

  return logs.flatMap((log) => {
    if (!log.zoneId || !log.woredaId || !log.kebeleId) return [];
    if (!canAccessLocation(user, { zoneId: log.zoneId, woredaId: log.woredaId, kebeleId: log.kebeleId })) {
      return [];
    }
    const value = (log.newValue ?? {}) as Record<string, unknown>;
    const reference = String(value.reference ?? "").trim();
    if (!reference) return [];

    const amount = Number(value.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return [];

    return [
      {
        id: log.id,
        residentId: log.resourceId,
        description: log.description,
        performedBy: log.userEmail,
        timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString(),
        amount: Number(amount.toFixed(2)),
        currency: String(value.currency ?? "ETB"),
        method: String(value.method ?? "unknown"),
        provider: String(value.provider ?? "ethiopay"),
        reference,
        status: String(value.status ?? "unknown"),
        phase: String(value.phase ?? "unknown"),
        mode: String(value.mode ?? "unknown"),
        zoneId: log.zoneId,
        woredaId: log.woredaId,
        kebeleId: log.kebeleId,
      },
    ];
  });
}
