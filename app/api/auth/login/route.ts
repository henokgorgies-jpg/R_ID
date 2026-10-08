import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function getRateLimitKey(request: NextRequest, email: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${ip}:${email.toLowerCase()}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (now - entry.windowStart > WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now });
    return;
  }
  loginAttempts.set(key, { count: entry.count + 1, windowStart: entry.windowStart });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const rateLimitKey = getRateLimitKey(request, normalizedEmail);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
    }

    const user = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.isActive) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    loginAttempts.delete(rateLimitKey);

    await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    try {
      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          action: "login",
          resourceType: "system",
          description: "User logged in",
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to write login audit log:", error);
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        scope: {
          type: user.scopeType,
          zoneId: user.scopeZoneId,
          woredaId: user.scopeWoredaId,
          kebeleId: user.scopeKebeleId,
        },
        isActive: user.isActive,
        lastLogin: new Date().toISOString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
    response.cookies.set(sessionCookie.name, createSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionCookie.maxAge,
    });
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
