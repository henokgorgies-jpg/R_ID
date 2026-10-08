import crypto from "node:crypto";

export type SignedQrClaims = {
  v: 1;
  typ: "kebele_id_qr";
  residentId: string;
  idNumber: string;
  issuedAt: string;
  expiresAt: string;
  jti: string;
  iat: number;
};

function getSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET || process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing QR_SIGNING_SECRET or AUTH_SESSION_SECRET");
  }
  return secret;
}

function b64urlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64").toString("utf8");
}

function sign(input: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(input);
  return b64urlEncode(hmac.digest());
}

export function createSignedQrToken(input: {
  residentId: string;
  idNumber: string;
  issuedAt: Date;
  expiresAt: Date;
}): string {
  const secret = getSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const claims: SignedQrClaims = {
    v: 1,
    typ: "kebele_id_qr",
    residentId: input.residentId,
    idNumber: input.idNumber,
    issuedAt: input.issuedAt.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedHeader = b64urlEncode(JSON.stringify(header));
  const encodedPayload = b64urlEncode(JSON.stringify(claims));
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(body, secret);
  return `${body}.${signature}`;
}

export function verifySignedQrToken(token: string): {
  valid: boolean;
  claims?: SignedQrClaims;
  reason?: string;
} {
  try {
    const secret = getSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, reason: "Malformed token" };

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signedBody = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = sign(signedBody, secret);

    const sigA = Buffer.from(encodedSignature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return { valid: false, reason: "Invalid signature" };
    }

    const payload = JSON.parse(b64urlDecode(encodedPayload)) as SignedQrClaims;
    if (payload.typ !== "kebele_id_qr" || payload.v !== 1) {
      return { valid: false, reason: "Unsupported token type" };
    }

    if (new Date(payload.expiresAt).getTime() < Date.now()) {
      return { valid: false, reason: "Token expired" };
    }

    return { valid: true, claims: payload };
  } catch {
    return { valid: false, reason: "Unable to verify token" };
  }
}
