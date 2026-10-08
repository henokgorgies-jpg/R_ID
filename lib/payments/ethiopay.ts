const DEFAULT_TIMEOUT_MS = 15000;

export const ID_GENERATION_FEE_ETB = 60;
export const ID_REISSUE_FEE_ETB = 100;

export type IdPaymentMode = "initial_issue" | "reissue";

export class EthioPayError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = "EthioPayError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type EthioPayTransaction = {
  transactionRef: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export function createMockEthioPayCharge(input: {
  amount: number;
  currency?: string;
}): EthioPayTransaction {
  return {
    transactionRef: `mock-kebele-id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    amount: input.amount,
    currency: (input.currency ?? "ETB").toUpperCase(),
    paymentMethod: "mock_card",
    status: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

type EthioPayTransactionResponse = {
  transaction?: {
    transactionRef?: string;
    amount?: number | string;
    currency?: string;
    paymentMethod?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  error?: string;
  code?: string;
};

function getEthioPayConfig() {
  const baseUrl = process.env.ETHIOPAY_BASE_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.ETHIOPAY_SECRET_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new EthioPayError("EthioPay is not configured. Set ETHIOPAY_BASE_URL and ETHIOPAY_SECRET_KEY.", 500);
  }
  return { baseUrl, apiKey };
}

function getTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

async function ethiopayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getEthioPayConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? getTimeoutSignal(DEFAULT_TIMEOUT_MS),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
  if (!res.ok) {
    throw new EthioPayError(payload?.error || "EthioPay request failed", res.status, payload?.code);
  }
  return payload as T;
}

function normalizeTransaction(payload: EthioPayTransactionResponse): EthioPayTransaction {
  const tx = payload.transaction;
  if (!tx?.transactionRef) {
    throw new EthioPayError("EthioPay did not return a valid transaction reference.", 502);
  }
  return {
    transactionRef: tx.transactionRef,
    amount: Number(tx.amount ?? 0),
    currency: (tx.currency ?? "ETB").toUpperCase(),
    paymentMethod: tx.paymentMethod ?? "card",
    status: (tx.status ?? "").toLowerCase(),
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

export async function createEthioPayCharge(input: {
  amount: number;
  currency?: string;
  externalReference: string;
  description?: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName?: string;
  metadata?: Record<string, unknown>;
}): Promise<EthioPayTransaction> {
  const response = await ethiopayRequest<EthioPayTransactionResponse>("/api/merchant/charges", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: (input.currency ?? "ETB").toUpperCase(),
      paymentMethod: "card",
      externalReference: input.externalReference,
      description: input.description,
      cardNumber: input.cardNumber,
      expiryDate: input.expiryDate,
      cvv: input.cvv,
      cardholderName: input.cardholderName,
      metadata: input.metadata,
    }),
  });
  return normalizeTransaction(response);
}

export async function getEthioPayMerchantTransaction(transactionRef: string): Promise<EthioPayTransaction> {
  const encodedRef = encodeURIComponent(transactionRef.trim());
  const response = await ethiopayRequest<EthioPayTransactionResponse>(`/api/merchant/transactions/${encodedRef}`);
  return normalizeTransaction(response);
}
