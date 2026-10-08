import { db } from "@/lib/db";
import { ID_GENERATION_FEE_ETB, ID_REISSUE_FEE_ETB } from "@/lib/payments/ethiopay";

const ID_PAYMENT_FEES_KEY = "id_payment_fees_v1";

export type IdPaymentFees = {
  initialIssueFeeEtb: number;
  reissueFeeEtb: number;
  currency: "ETB";
};

const DEFAULT_FEES: IdPaymentFees = {
  initialIssueFeeEtb: ID_GENERATION_FEE_ETB,
  reissueFeeEtb: ID_REISSUE_FEE_ETB,
  currency: "ETB",
};

function normalizeAmount(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Number(n.toFixed(2));
}

export async function getIdPaymentFees(): Promise<IdPaymentFees> {
  const rows = await db.$queryRaw<Array<{ value: unknown }>>`
    SELECT value
    FROM "AppSetting"
    WHERE key = ${ID_PAYMENT_FEES_KEY}
    LIMIT 1
  `;
  const value = rows[0]?.value;
  if (!value || typeof value !== "object") {
    return DEFAULT_FEES;
  }
  const raw = value as Record<string, unknown>;
  return {
    initialIssueFeeEtb: normalizeAmount(raw.initialIssueFeeEtb, DEFAULT_FEES.initialIssueFeeEtb),
    reissueFeeEtb: normalizeAmount(raw.reissueFeeEtb, DEFAULT_FEES.reissueFeeEtb),
    currency: "ETB",
  };
}

export async function setIdPaymentFees(input: {
  initialIssueFeeEtb: number;
  reissueFeeEtb: number;
}): Promise<IdPaymentFees> {
  const normalized: IdPaymentFees = {
    initialIssueFeeEtb: normalizeAmount(input.initialIssueFeeEtb, DEFAULT_FEES.initialIssueFeeEtb),
    reissueFeeEtb: normalizeAmount(input.reissueFeeEtb, DEFAULT_FEES.reissueFeeEtb),
    currency: "ETB",
  };
  await db.$executeRaw`
    INSERT INTO "AppSetting" (key, value, "createdAt", "updatedAt")
    VALUES (${ID_PAYMENT_FEES_KEY}, ${normalized}::jsonb, NOW(), NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = ${normalized}::jsonb, "updatedAt" = NOW()
  `;
  return normalized;
}
