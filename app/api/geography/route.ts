import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const zoneWhere =
      auth.user.scope.type === "city"
        ? {}
        : auth.user.scope.zoneId
          ? { id: auth.user.scope.zoneId }
          : { id: "__no_access__" };
    const woredaWhere =
      auth.user.scope.type === "city"
        ? {}
        : auth.user.scope.type === "zone" && auth.user.scope.zoneId
          ? { zoneId: auth.user.scope.zoneId }
          : auth.user.scope.type === "woreda" && auth.user.scope.woredaId
            ? { id: auth.user.scope.woredaId }
            : auth.user.scope.type === "kebele" && auth.user.scope.woredaId
              ? { id: auth.user.scope.woredaId }
              : { id: "__no_access__" };
    const kebeleWhere =
      auth.user.scope.type === "city"
        ? {}
        : auth.user.scope.type === "zone" && auth.user.scope.zoneId
          ? { zoneId: auth.user.scope.zoneId }
          : auth.user.scope.type === "woreda" && auth.user.scope.woredaId
            ? { woredaId: auth.user.scope.woredaId }
            : auth.user.scope.type === "kebele" && auth.user.scope.kebeleId
              ? { id: auth.user.scope.kebeleId }
              : { id: "__no_access__" };

    const [zones, woredas, kebeles] = await Promise.all([
      db.zone.findMany({ where: zoneWhere, orderBy: { code: "asc" } }),
      db.woreda.findMany({ where: woredaWhere, orderBy: [{ zoneId: "asc" }, { code: "asc" }] }),
      db.kebele.findMany({ where: kebeleWhere, orderBy: [{ woredaId: "asc" }, { code: "asc" }] }),
    ]);

    return NextResponse.json({ zones, woredas, kebeles });
  } catch (error) {
    console.error("Failed to fetch geography:", error);
    return NextResponse.json({ error: "Failed to fetch geography" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "admin:kebeles");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      entityType?: "zone" | "woreda" | "kebele";
      code?: string;
      name?: string;
      zoneId?: string;
      woredaId?: string;
      householdCount?: number;
    };

    const entityType = body.entityType;
    const code = body.code?.trim();
    const name = body.name?.trim();
    if (!entityType || !name) {
      return NextResponse.json({ error: "entityType and name are required" }, { status: 400 });
    }

    if (entityType === "zone") {
      if (auth.user.role !== "super_admin") {
        return NextResponse.json({ error: "Only super admin can create zones" }, { status: 403 });
      }

      const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
      const prefix = (letters.slice(0, 3) || "ZON").padEnd(3, "X");
      const existingZones = await db.zone.findMany({
        where: { code: { startsWith: `${prefix}-` } },
        select: { code: true },
      });
      const maxSuffix = existingZones.reduce((max, zone) => {
        const suffix = Number(zone.code.split("-").at(-1));
        if (!Number.isFinite(suffix)) return max;
        return Math.max(max, suffix);
      }, 0);
      const generatedCode = `${prefix}-${String(maxSuffix + 1).padStart(3, "0")}`;
      const id = `zone-${generatedCode.toLowerCase()}`;

      const created = await db.zone.create({
        data: {
          id,
          code: generatedCode,
          name,
          population: 0,
        },
      });
      return NextResponse.json({ zone: created }, { status: 201 });
    }

    if (entityType === "woreda") {
      if (!body.zoneId) return NextResponse.json({ error: "zoneId is required for woreda" }, { status: 400 });
      if (!["super_admin", "zone_admin"].includes(auth.user.role)) {
        return NextResponse.json({ error: "Only super admin and zone admin can create woredas" }, { status: 403 });
      }
      if (auth.user.role === "zone_admin" && auth.user.scope.zoneId !== body.zoneId) {
        return NextResponse.json({ error: "Zone admin can only create woredas in assigned zone" }, { status: 403 });
      }

      const zone = await db.zone.findUnique({ where: { id: body.zoneId }, select: { id: true } });
      if (!zone) return NextResponse.json({ error: "Invalid zoneId" }, { status: 400 });

      const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
      const prefix = (letters.slice(0, 3) || "WRD").padEnd(3, "X");
      const existingWoredas = await db.woreda.findMany({
        where: {
          zoneId: body.zoneId,
          code: { startsWith: `${prefix}-` },
        },
        select: { code: true },
      });
      const maxSuffix = existingWoredas.reduce((max, woreda) => {
        const suffix = Number(woreda.code.split("-").at(-1));
        if (!Number.isFinite(suffix)) return max;
        return Math.max(max, suffix);
      }, 0);
      const generatedCode = `${prefix}-${String(maxSuffix + 1).padStart(3, "0")}`;
      const id = `woreda-${body.zoneId}-${generatedCode.toLowerCase()}`;
      const created = await db.woreda.create({
        data: {
          id,
          zoneId: body.zoneId,
          code: generatedCode,
          name,
          population: 0,
        },
      });
      return NextResponse.json({ woreda: created }, { status: 201 });
    }

    if (entityType === "kebele") {
      if (!body.zoneId || !body.woredaId) {
        return NextResponse.json({ error: "zoneId and woredaId are required for kebele" }, { status: 400 });
      }
      if (!["super_admin", "zone_admin", "woreda_admin"].includes(auth.user.role)) {
        return NextResponse.json({ error: "Only super admin, zone admin, and woreda admin can create kebeles" }, { status: 403 });
      }

      if (auth.user.role === "zone_admin" && auth.user.scope.zoneId !== body.zoneId) {
        return NextResponse.json({ error: "Zone admin can only create kebeles in assigned zone" }, { status: 403 });
      }
      if (auth.user.role === "woreda_admin" && auth.user.scope.woredaId !== body.woredaId) {
        return NextResponse.json({ error: "Woreda admin can only create kebeles in assigned woreda" }, { status: 403 });
      }

      const woreda = await db.woreda.findUnique({
        where: { id: body.woredaId },
        select: { id: true, zoneId: true },
      });
      if (!woreda || woreda.zoneId !== body.zoneId) {
        return NextResponse.json({ error: "Invalid zone/woreda relation" }, { status: 400 });
      }

      const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
      const prefix = (letters.slice(0, 3) || "KBL").padEnd(3, "X");
      const existingKebeles = await db.kebele.findMany({
        where: {
          woredaId: body.woredaId,
          code: { startsWith: `${prefix}-` },
        },
        select: { code: true },
      });
      const maxSuffix = existingKebeles.reduce((max, kebele) => {
        const suffix = Number(kebele.code.split("-").at(-1));
        if (!Number.isFinite(suffix)) return max;
        return Math.max(max, suffix);
      }, 0);
      const generatedCode = `${prefix}-${String(maxSuffix + 1).padStart(3, "0")}`;
      const id = `kebele-${body.woredaId}-${generatedCode.toLowerCase()}`;
      const created = await db.kebele.create({
        data: {
          id,
          zoneId: body.zoneId,
          woredaId: body.woredaId,
          code: generatedCode,
          name,
          population: 0,
          householdCount: Number.isFinite(Number(body.householdCount ?? 0)) ? Number(body.householdCount ?? 0) : 0,
        },
      });
      return NextResponse.json({ kebele: created }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported entityType" }, { status: 400 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Duplicate code/name for this scope" }, { status: 409 });
    }
    console.error("Failed to create geography entity:", error);
    return NextResponse.json({ error: "Failed to create geography entity" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, "admin:kebeles");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      entityType?: "kebele";
      id?: string;
      name?: string;
    };

    if (body.entityType !== "kebele") {
      return NextResponse.json({ error: "Only kebele updates are supported" }, { status: 400 });
    }

    const id = body.id?.trim();
    const name = body.name?.trim();
    if (!id || !name) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 });
    }

    const target = await db.kebele.findUnique({
      where: { id },
      select: { id: true, zoneId: true, woredaId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Kebele not found" }, { status: 404 });
    }

    if (!["super_admin", "zone_admin", "woreda_admin"].includes(auth.user.role)) {
      return NextResponse.json({ error: "Only super admin, zone admin, and woreda admin can update kebeles" }, { status: 403 });
    }
    if (auth.user.role === "zone_admin" && auth.user.scope.zoneId !== target.zoneId) {
      return NextResponse.json({ error: "Zone admin can only update kebeles in assigned zone" }, { status: 403 });
    }
    if (auth.user.role === "woreda_admin" && auth.user.scope.woredaId !== target.woredaId) {
      return NextResponse.json({ error: "Woreda admin can only update kebeles in assigned woreda" }, { status: 403 });
    }

    const updated = await db.kebele.update({
      where: { id: target.id },
      data: { name },
    });

    return NextResponse.json({ kebele: updated });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A kebele with this name already exists in the woreda" }, { status: 409 });
    }
    console.error("Failed to update geography entity:", error);
    return NextResponse.json({ error: "Failed to update geography entity" }, { status: 500 });
  }
}
