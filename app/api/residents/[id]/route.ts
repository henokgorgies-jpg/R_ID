import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";
import { validateFamilyGraphForUpdate } from "@/lib/family/relationship-validation";
import { runFaceEmbeddingJob } from "@/lib/jobs/face-embedding-job";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "residents:update");
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const existing = await db.resident.findUnique({
      where: { id },
      select: {
        id: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
        householdId: true,
        photoUrl: true,
      },
    });
    if (!existing) return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    if (
      !canAccessLocation(auth.user, {
        zoneId: existing.zoneId,
        woredaId: existing.woredaId,
        kebeleId: existing.kebeleId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const firstName = (body.firstName as string | undefined)?.trim() ?? "";
    const fatherName = (body.fatherName as string | undefined)?.trim() ?? "";
    const grandFatherName = (body.grandFatherName as string | undefined)?.trim() ?? "";
    const dateOfBirth = body.dateOfBirth as string | undefined;
    const gender = body.gender as "male" | "female" | undefined;
    const zoneId = (body.zoneId as string | undefined)?.trim() ?? "";
    const woredaId = (body.woredaId as string | undefined)?.trim() ?? "";
    const kebeleId = (body.kebeleId as string | undefined)?.trim() ?? "";
    const email = (body.email as string | null | undefined) ?? null;
    const maritalStatus = body.maritalStatus as "single" | "married" | "divorced" | "widowed" | "separated" | undefined;
    const householdRole = body.householdRole as "head" | "spouse" | "child" | "relative" | "other" | null | undefined;
    const fatherResidentId = (body.fatherResidentId as string | null | undefined) ?? null;
    const motherResidentId = (body.motherResidentId as string | null | undefined) ?? null;
    const householdIdInput = (body.householdId as string | null | undefined) ?? undefined;
    const resolvedHouseholdId =
      householdIdInput === undefined ? existing.householdId : householdIdInput;
    const incomingAddress =
      body.address && typeof body.address === "object"
        ? ({ ...(body.address as Record<string, unknown>) } as Record<string, unknown>)
        : null;
    const incomingSpouseResidentId =
      typeof incomingAddress?.spouseResidentId === "string" && incomingAddress.spouseResidentId.trim()
        ? incomingAddress.spouseResidentId.trim()
        : null;
    const incomingSpouseNameParts =
      incomingAddress?.spouseNameParts &&
      typeof incomingAddress.spouseNameParts === "object" &&
      !Array.isArray(incomingAddress.spouseNameParts)
        ? (incomingAddress.spouseNameParts as Record<string, unknown>)
        : null;
    const incomingSpouseNameFromParts = incomingSpouseNameParts
      ? [
          typeof incomingSpouseNameParts.firstName === "string" ? incomingSpouseNameParts.firstName.trim() : "",
          typeof incomingSpouseNameParts.fatherName === "string" ? incomingSpouseNameParts.fatherName.trim() : "",
          typeof incomingSpouseNameParts.grandFatherName === "string"
            ? incomingSpouseNameParts.grandFatherName.trim()
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      : "";
    const incomingSpouseName =
      typeof incomingAddress?.spouseName === "string" && incomingAddress.spouseName.trim()
        ? incomingAddress.spouseName.trim()
        : incomingSpouseNameFromParts || null;

    let spouseToLink:
      | {
          id: string;
          firstName: string;
          fatherName: string;
          grandFatherName: string;
          gender: "male" | "female";
          zoneId: string;
          woredaId: string;
          kebeleId: string;
          householdId: string | null;
          address: unknown;
        }
      | null = null;
    let normalizedAddress = incomingAddress;

    if (!firstName) errors.firstName = "First name is required";
    if (!fatherName) errors.fatherName = "Father name is required";
    if (!grandFatherName) errors.grandFatherName = "Grand father name is required";
    if (!dateOfBirth || Number.isNaN(new Date(dateOfBirth).getTime())) errors.dateOfBirth = "Valid date of birth is required";
    if (gender && !["male", "female"].includes(gender)) errors.gender = "Gender must be male or female";
    if (!zoneId) errors.zoneId = "Zone is required";
    if (!woredaId) errors.woredaId = "Woreda is required";
    if (!kebeleId) errors.kebeleId = "Kebele is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";
    if (maritalStatus && householdRole) {
      const allowedRoles =
        maritalStatus === "single"
          ? ["head", "child"]
          : ["head", "spouse", "child", "relative"];
      if (!allowedRoles.includes(householdRole)) {
        errors.householdRole = `Invalid household role '${householdRole}' for marital status '${maritalStatus}'`;
      }
    }
    if (householdRole === "head" && maritalStatus !== "single" && !incomingSpouseResidentId && !incomingSpouseName) {
      errors.spouseResidentId = "Spouse link or spouse name is required for non-single household heads";
    }
    if (householdRole === "head" && maritalStatus === "married" && incomingSpouseResidentId) {
      if (!resolvedHouseholdId) {
        errors.householdId = "Household is required when linking a married spouse";
      } else if (incomingSpouseResidentId === id) {
        errors.spouseResidentId = "Resident cannot be linked as their own spouse";
      } else {
        spouseToLink = await db.resident.findUnique({
          where: { id: incomingSpouseResidentId },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            gender: true,
            zoneId: true,
            woredaId: true,
            kebeleId: true,
            householdId: true,
            address: true,
          },
        });
        if (!spouseToLink) {
          errors.spouseResidentId = "Selected spouse record not found";
        } else if (
          spouseToLink.zoneId !== zoneId ||
          spouseToLink.woredaId !== woredaId ||
          spouseToLink.kebeleId !== kebeleId
        ) {
          errors.spouseResidentId = "Spouse must be in the same administrative scope";
        } else if (spouseToLink.householdId && spouseToLink.householdId !== resolvedHouseholdId) {
          errors.spouseResidentId = "Selected spouse already belongs to another household";
        } else {
          normalizedAddress = {
            ...(incomingAddress ?? {}),
            spouseResidentId: spouseToLink.id,
            spouseName: `${spouseToLink.firstName} ${spouseToLink.fatherName} ${spouseToLink.grandFatherName}`.trim(),
            spouseNameParts: {
              firstName: spouseToLink.firstName,
              fatherName: spouseToLink.fatherName,
              grandFatherName: spouseToLink.grandFatherName,
            },
          };
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fieldErrors: errors }, { status: 400 });
    }

    const kebele = await db.kebele.findFirst({
      where: { id: kebeleId, woredaId, zoneId },
      select: { id: true, woredaId: true, zoneId: true },
    });
    if (!kebele) return NextResponse.json({ error: "Invalid zone/woreda/kebele combination" }, { status: 400 });
    if (
      !canAccessLocation(auth.user, {
        zoneId: kebele.zoneId,
        woredaId: kebele.woredaId,
        kebeleId: kebele.id,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const familyGraphError = await validateFamilyGraphForUpdate(db, {
      residentId: id,
      fatherResidentId,
      motherResidentId,
      householdId: (body.householdId as string | null | undefined) ?? null,
    });
    if (familyGraphError) {
      return NextResponse.json({ error: familyGraphError }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const autoLinkChildrenToSpouse = async (input: {
        householdId: string;
        spouse: {
          id: string;
          gender: "male" | "female";
          firstName: string;
          fatherName: string;
          grandFatherName: string;
        };
      }) => {
        const householdHead = await tx.resident.findFirst({
          where: { householdId: input.householdId, householdRole: "head" },
          select: { id: true },
        });
        if (!householdHead) return;

        const spouseFullName = `${input.spouse.firstName} ${input.spouse.fatherName} ${input.spouse.grandFatherName}`.trim();
        if (input.spouse.gender === "female") {
          await tx.resident.updateMany({
            where: {
              householdId: input.householdId,
              householdRole: "child",
              id: { not: input.spouse.id },
              motherResidentId: null,
              OR: [{ fatherResidentId: householdHead.id }, { fatherResidentId: null }],
            },
            data: {
              motherResidentId: input.spouse.id,
              motherName: spouseFullName,
            },
          });
          return;
        }

        await tx.resident.updateMany({
          where: {
            householdId: input.householdId,
            householdRole: "child",
            id: { not: input.spouse.id },
            fatherResidentId: null,
            OR: [{ motherResidentId: householdHead.id }, { motherResidentId: null }],
          },
          data: {
            fatherResidentId: input.spouse.id,
          },
        });
      };

      const residentUpdated = await tx.resident.update({
        where: { id },
        data: {
          firstName,
          fatherName,
          grandFatherName,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth as string) : undefined,
          gender: (body.gender as "male" | "female" | undefined) ?? undefined,
          maritalStatus: maritalStatus ?? undefined,
          nationality: (body.nationality as string) ?? undefined,
          ethnicity: (body.ethnicity as string | null | undefined) ?? undefined,
          religion: (body.religion as string | null | undefined) ?? undefined,
          occupation: (body.occupation as string | null | undefined) ?? undefined,
          motherName: (body.motherName as string | null | undefined) ?? undefined,
          fatherResidentId: fatherResidentId ?? undefined,
          motherResidentId: motherResidentId ?? undefined,
          email: (body.email as string | null | undefined) ?? undefined,
          phoneNumber: (body.phoneNumber as string | null | undefined) ?? undefined,
          zoneId: (body.zoneId as string) ?? undefined,
          woredaId: (body.woredaId as string) ?? undefined,
          kebeleId: (body.kebeleId as string) ?? undefined,
          householdId: (body.householdId as string | null | undefined) ?? undefined,
          householdRole: householdRole ?? undefined,
          photoUrl: (body.photoUrl as string | null | undefined) ?? undefined,
          faceStatus:
            body.photoUrl !== undefined && (body.photoUrl as string | null) !== existing.photoUrl ? "pending" : undefined,
          faceError:
            body.photoUrl !== undefined && (body.photoUrl as string | null) !== existing.photoUrl ? null : undefined,
          faceUpdatedAt:
            body.photoUrl !== undefined && (body.photoUrl as string | null) !== existing.photoUrl ? null : undefined,
          address: (normalizedAddress as object | null | undefined) ?? undefined,
        },
      });

      if (householdRole === "head" && maritalStatus === "married" && spouseToLink && resolvedHouseholdId) {
        const spouseAddress =
          spouseToLink.address && typeof spouseToLink.address === "object" && !Array.isArray(spouseToLink.address)
            ? ({ ...(spouseToLink.address as Record<string, unknown>) } as Record<string, unknown>)
            : {};
        spouseAddress.spouseResidentId = residentUpdated.id;
        spouseAddress.spouseName =
          `${residentUpdated.firstName} ${residentUpdated.fatherName} ${residentUpdated.grandFatherName}`.trim();
        spouseAddress.spouseNameParts = {
          firstName: residentUpdated.firstName,
          fatherName: residentUpdated.fatherName,
          grandFatherName: residentUpdated.grandFatherName,
        };

        await tx.resident.update({
          where: { id: spouseToLink.id },
          data: {
            householdId: resolvedHouseholdId,
            householdRole: "spouse",
            maritalStatus: "married",
            address: spouseAddress as object,
          },
        });

        await autoLinkChildrenToSpouse({
          householdId: resolvedHouseholdId,
          spouse: {
            id: spouseToLink.id,
            gender: spouseToLink.gender,
            firstName: spouseToLink.firstName,
            fatherName: spouseToLink.fatherName,
            grandFatherName: spouseToLink.grandFatherName,
          },
        });
      }

      if (residentUpdated.householdRole === "spouse" && residentUpdated.householdId) {
        await autoLinkChildrenToSpouse({
          householdId: residentUpdated.householdId,
          spouse: {
            id: residentUpdated.id,
            gender: residentUpdated.gender,
            firstName: residentUpdated.firstName,
            fatherName: residentUpdated.fatherName,
            grandFatherName: residentUpdated.grandFatherName,
          },
        });
      }

      return residentUpdated;
    });

    const photoChanged = body.photoUrl !== undefined && (body.photoUrl as string | null) !== existing.photoUrl;
    if (photoChanged) {
      const photo = (body.photoUrl as string | null) ?? null;
      if (photo) {
        void runFaceEmbeddingJob({
          residentId: updated.id,
          photoUrl: photo,
          scope: {
            zoneId: updated.zoneId,
            woredaId: updated.woredaId,
            kebeleId: updated.kebeleId,
          },
          actor: {
            id: auth.user.id,
            email: auth.user.email,
            role: auth.user.role,
          },
        });
      } else {
        await db.resident.update({
          where: { id: updated.id },
          data: {
            faceStatus: "failed",
            faceError: "Photo removed; embedding is unavailable.",
            faceUpdatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ resident: updated });
  } catch (error) {
    console.error("Failed to update resident:", error);
    return NextResponse.json({ error: "Failed to update resident" }, { status: 500 });
  }
}
