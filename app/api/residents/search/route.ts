import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, residentScopeWhere } from "@/lib/auth/server";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parsePositiveInt(value: string | null, fallback: number) {
  const num = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "residents:read");
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const status = (searchParams.get("status") ?? "all").trim();
    const gender = (searchParams.get("gender") ?? "all").trim();
    const kebeleId = (searchParams.get("kebeleId") ?? "all").trim();
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const andFilters: Prisma.ResidentWhereInput[] = [residentScopeWhere(auth.user)];

    if (status !== "all") andFilters.push({ status: status as any });
    if (gender !== "all") andFilters.push({ gender: gender as any });
    if (kebeleId !== "all") andFilters.push({ kebeleId });

    if (q.length > 0) {
      const normalized = q.toLowerCase();
      const tokens = normalized.split(/\s+/).filter(Boolean);

      const broadMatch: Prisma.ResidentWhereInput = {
        OR: [
          { firstName: { contains: normalized, mode: "insensitive" } },
          { fatherName: { contains: normalized, mode: "insensitive" } },
          { grandFatherName: { contains: normalized, mode: "insensitive" } },
          { idNumber: { contains: normalized, mode: "insensitive" } },
          { kebeleId: { contains: normalized, mode: "insensitive" } },
          { phoneNumber: { contains: normalized, mode: "insensitive" } },
        ],
      };

      const tokenMatch: Prisma.ResidentWhereInput =
        tokens.length <= 1
          ? broadMatch
          : {
              AND: tokens.map((token) => ({
                OR: [
                  { firstName: { contains: token, mode: "insensitive" } },
                  { fatherName: { contains: token, mode: "insensitive" } },
                  { grandFatherName: { contains: token, mode: "insensitive" } },
                  { idNumber: { contains: token, mode: "insensitive" } },
                  { phoneNumber: { contains: token, mode: "insensitive" } },
                ],
              })),
            };

      andFilters.push({
        OR: [
          tokenMatch,
          broadMatch,
          // Fast-path exact/starts-with style lookups for identifier-like queries.
          { idNumber: { startsWith: q } },
          { kebeleId: { startsWith: q } },
        ],
      });
    }

    const where: Prisma.ResidentWhereInput = { AND: andFilters };

    const [total, residents] = await Promise.all([
      db.resident.count({ where }),
      db.resident.findMany({
        where,
        orderBy: [{ registrationDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          fatherName: true,
          grandFatherName: true,
          idNumber: true,
          phoneNumber: true,
          gender: true,
          status: true,
          dateOfBirth: true,
          registrationDate: true,
          kebeleId: true,
          zoneId: true,
          woredaId: true,
          kebele: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      residents: residents.map((resident) => ({
        ...resident,
        dateOfBirth: resident.dateOfBirth.toISOString().slice(0, 10),
        registrationDate: resident.registrationDate.toISOString().slice(0, 10),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Failed resident search:", error);
    return NextResponse.json({ error: "Failed resident search" }, { status: 500 });
  }
}

