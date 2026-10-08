import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ user: null }, { status: 401 });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        scope: {
          type: user.scope.type,
          zoneId: user.scope.zoneId ?? null,
          woredaId: user.scope.woredaId ?? null,
          kebeleId: user.scope.kebeleId ?? null,
        },
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Session check failed:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
