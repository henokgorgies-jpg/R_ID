import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission, residentScopeWhere } from "@/lib/auth/server";
import { validateFamilyGraphForCreate } from "@/lib/family/relationship-validation";
import { runFaceEmbeddingJob } from "@/lib/jobs/face-embedding-job";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const FACE_PIPELINE_SYNC = process.env.FACE_PIPELINE_SYNC === "true";

function splitNameParts(fullName: string) {
  const chunks = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: chunks[0] || "Unknown",
    fatherName: chunks[1] || "Unknown",
    grandFatherName: chunks.slice(2).join(" ") || "Unknown",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "residents:read");
  if (auth instanceof NextResponse) return auth;

  try {
    const where = residentScopeWhere(auth.user);
    const residents = await db.resident.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        fatherName: true,
        grandFatherName: true,
        kebeleId: true,
        zoneId: true,
        woredaId: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        nationality: true,
        ethnicity: true,
        religion: true,
        occupation: true,
        email: true,
        address: true,
        photoUrl: true,
        faceStatus: true,
        faceError: true,
        faceUpdatedAt: true,
        householdId: true,
        householdRole: true,
        motherName: true,
        fatherResidentId: true,
        motherResidentId: true,
        status: true,
        phoneNumber: true,
        idNumber: true,
        idStatus: true,
        idIssuedDate: true,
        idExpiryDate: true,
        createdAt: true,
        kebele: {
          select: {
            name: true,
          },
        },
        registeredByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        faceEmbedding: {
          select: {
            qualityScore: true,
            faceCount: true,
            modelVersion: true,
          },
        },
      },
    });

    return NextResponse.json({
      residents: residents.map((resident: any) => ({
        id: resident.id,
        firstName: resident.firstName,
        fatherName: resident.fatherName,
        grandFatherName: resident.grandFatherName,
        kebeleId: resident.kebeleId,
        kebeleName: resident.kebele.name,
        zoneId: resident.zoneId,
        woredaId: resident.woredaId,
        dateOfBirth: resident.dateOfBirth.toISOString().slice(0, 10),
        gender: resident.gender,
        maritalStatus: resident.maritalStatus,
        nationality: resident.nationality,
        ethnicity: resident.ethnicity,
        religion: resident.religion,
        occupation: resident.occupation,
        email: resident.email,
        address: resident.address,
        photoUrl: resident.photoUrl,
        faceStatus: resident.faceStatus,
        faceError: resident.faceError,
        faceUpdatedAt: resident.faceUpdatedAt?.toISOString() ?? null,
        faceQualityScore: resident.faceEmbedding?.qualityScore ?? null,
        faceCount: resident.faceEmbedding?.faceCount ?? null,
        faceModelVersion: resident.faceEmbedding?.modelVersion ?? null,
        householdId: resident.householdId,
        householdRole: resident.householdRole,
        motherName: resident.motherName,
        fatherResidentId: resident.fatherResidentId,
        motherResidentId: resident.motherResidentId,
        status: resident.status,
        phoneNumber: resident.phoneNumber,
        idNumber: resident.idNumber,
        idStatus: resident.idStatus,
        idIssuedDate: resident.idIssuedDate?.toISOString().slice(0, 10) ?? null,
        idExpiryDate: resident.idExpiryDate?.toISOString().slice(0, 10) ?? null,
        registrationDate: resident.createdAt.toISOString().slice(0, 10),
        registeredByName: `${resident.registeredByUser.firstName} ${resident.registeredByUser.lastName}`.trim(),
        registeredByEmail: resident.registeredByUser.email,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch residents:", error);
    return NextResponse.json({ error: "Failed to fetch residents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "residents:create");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      firstName?: string;
      fatherName?: string;
      grandFatherName?: string;
      dateOfBirth?: string;
      gender?: "male" | "female";
      maritalStatus?: "single" | "married" | "divorced" | "widowed" | "separated";
      zoneId?: string;
      woredaId?: string;
      kebeleId?: string;
      phoneNumber?: string;
      nationality?: string;
      ethnicity?: string;
      religion?: string;
      occupation?: string;
      email?: string;
      address?: {
        city?: string;
        subcity?: string;
        streetName?: string;
        houseNumber?: string;
        relatives?: Array<{
          firstName?: string;
          fatherName?: string;
          grandFatherName?: string;
        }>;
      };
      photoUrl?: string;
      householdId?: string;
      householdRole?: "head" | "spouse" | "child" | "relative" | "other";
      linkedHeadResidentId?: string;
      motherName?: string;
      fatherResidentId?: string;
      motherResidentId?: string;
      spouseResidentId?: string;
      spouseName?: string;
      spouseNameParts?: {
        firstName?: string;
        fatherName?: string;
        grandFatherName?: string;
      };
      childrenNames?: string[];
    };

    const required = ["firstName", "fatherName", "grandFatherName", "dateOfBirth", "gender", "maritalStatus", "zoneId", "woredaId", "kebeleId"] as const;
    for (const key of required) {
      if (!body[key]) return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
    }

    const normalizeName = (value: string | undefined | null) => (value ?? "").trim().toLowerCase();
    const currentResidentFullName = `${body.firstName} ${body.fatherName} ${body.grandFatherName}`.trim();
    const isChildAutoFamilyDetectMode = body.householdRole === "child" && body.maritalStatus === "single";
    const isSilentAutoFamilyDetectMode = body.householdRole !== "child" && body.maritalStatus !== "single";
    if (isChildAutoFamilyDetectMode || isSilentAutoFamilyDetectMode) {
      const familyHeadCandidates = await db.resident.findMany({
        where: {
          zoneId: body.zoneId,
          woredaId: body.woredaId,
          kebeleId: body.kebeleId,
          householdRole: "head",
          householdId: { not: null },
        },
        select: {
          id: true,
          householdId: true,
          zoneId: true,
          woredaId: true,
          kebeleId: true,
          address: true,
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      });
      const linkedHead = familyHeadCandidates.find((candidate) => {
        const childrenNames = Array.isArray((candidate.address as any)?.childrenNames)
          ? ((candidate.address as any).childrenNames as string[])
          : [];
        return childrenNames.some((name) => normalizeName(name) === normalizeName(currentResidentFullName));
      });
      if (linkedHead?.householdId) {
        if (!body.fatherResidentId) body.fatherResidentId = linkedHead.id;
        if (isChildAutoFamilyDetectMode) {
          body.linkedHeadResidentId = linkedHead.id;
          body.householdId = linkedHead.householdId;
          body.zoneId = linkedHead.zoneId;
          body.woredaId = linkedHead.woredaId;
          body.kebeleId = linkedHead.kebeleId;
        }
        const linkedMother = await db.resident.findFirst({
          where: {
            householdId: linkedHead.householdId,
            householdRole: "spouse",
            id: { not: linkedHead.id },
          },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
          },
        });
        if (linkedMother) {
          if (!body.motherResidentId) body.motherResidentId = linkedMother.id;
          if (!body.motherName) {
            body.motherName = `${linkedMother.firstName} ${linkedMother.fatherName} ${linkedMother.grandFatherName}`.trim();
          }
        }
      }
    }
    const spouseMatchCandidates = await db.resident.findMany({
      where: {
        zoneId: body.zoneId,
        woredaId: body.woredaId,
        kebeleId: body.kebeleId,
        householdRole: "head",
        maritalStatus: "married",
        householdId: { not: null },
      },
      select: {
        id: true,
        householdId: true,
        address: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const matchedSpouseHead = spouseMatchCandidates.find((candidate) => {
      const parts = (candidate.address as any)?.spouseNameParts;
      return (
        normalizeName(parts?.firstName) === normalizeName(body.firstName) &&
        normalizeName(parts?.fatherName) === normalizeName(body.fatherName) &&
        normalizeName(parts?.grandFatherName) === normalizeName(body.grandFatherName)
      );
    });
    if (matchedSpouseHead && matchedSpouseHead.householdId) {
      const existingSpouse = await db.resident.findFirst({
        where: {
          householdId: matchedSpouseHead.householdId,
          householdRole: "spouse",
        },
        select: { id: true },
      });
      if (existingSpouse) {
        return NextResponse.json({ error: "A spouse is already registered for the matched household" }, { status: 400 });
      }
      body.maritalStatus = "married";
      body.householdRole = "spouse";
      body.linkedHeadResidentId = matchedSpouseHead.id;
      body.householdId = matchedSpouseHead.householdId;
    }

    // Enforce household role policy by marital status.
    if (body.householdRole) {
      const allowedRoles =
        body.maritalStatus === "single"
          ? ["head", "child"]
          : ["head", "spouse", "child", "relative"];
      if (!allowedRoles.includes(body.householdRole)) {
        return NextResponse.json(
          { error: `Invalid household role '${body.householdRole}' for marital status '${body.maritalStatus}'` },
          { status: 400 },
        );
      }
    }
    const normalizedChildrenNames = (body.childrenNames ?? [])
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 20);

    const kebele = await db.kebele.findFirst({
      where: { id: body.kebeleId, woredaId: body.woredaId, zoneId: body.zoneId },
      select: { id: true, woredaId: true, zoneId: true },
    });
    if (!kebele) {
      return NextResponse.json({ error: "Invalid zone/woreda/kebele combination" }, { status: 400 });
    }
    if (
      !canAccessLocation(auth.user, {
        zoneId: kebele.zoneId,
        woredaId: kebele.woredaId,
        kebeleId: kebele.id,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let resolvedHouseholdId = body.householdId?.trim() || null;
    if (body.householdRole && body.householdRole !== "head") {
      if (body.linkedHeadResidentId) {
        const head = await db.resident.findUnique({
          where: { id: body.linkedHeadResidentId },
          select: {
            id: true,
            householdId: true,
            householdRole: true,
            zoneId: true,
            woredaId: true,
            kebeleId: true,
          },
        });
        if (!head || head.householdRole !== "head" || !head.householdId) {
          return NextResponse.json({ error: "Invalid family head selected" }, { status: 400 });
        }
        if (head.zoneId !== body.zoneId || head.woredaId !== body.woredaId || head.kebeleId !== body.kebeleId) {
          return NextResponse.json({ error: "Family head must be in the same administrative scope" }, { status: 400 });
        }
        resolvedHouseholdId = head.householdId;
      }
      if (!resolvedHouseholdId) {
        return NextResponse.json(
          { error: "For spouse/child/relative, family head or household is required" },
          { status: 400 },
        );
      }
    }
    if (body.householdRole === "head" && !resolvedHouseholdId) {
      resolvedHouseholdId = `household-${Date.now()}`;
    }
    if (body.householdRole && body.householdRole !== "head" && resolvedHouseholdId) {
      const existingHousehold = await db.household.findUnique({
        where: { id: resolvedHouseholdId },
        select: { id: true, zoneId: true, woredaId: true, kebeleId: true },
      });
      if (!existingHousehold) {
        return NextResponse.json({ error: "Selected household does not exist" }, { status: 400 });
      }
      if (
        existingHousehold.zoneId !== body.zoneId ||
        existingHousehold.woredaId !== body.woredaId ||
        existingHousehold.kebeleId !== body.kebeleId
      ) {
        return NextResponse.json({ error: "Selected household is outside resident administrative scope" }, { status: 400 });
      }
    }

    const structuredSpouseName = {
      firstName: body.spouseNameParts?.firstName?.trim() || "",
      fatherName: body.spouseNameParts?.fatherName?.trim() || "",
      grandFatherName: body.spouseNameParts?.grandFatherName?.trim() || "",
    };
    const hasStructuredSpouseName =
      !!structuredSpouseName.firstName &&
      !!structuredSpouseName.fatherName &&
      !!structuredSpouseName.grandFatherName;
    let resolvedSpouseResidentId: string | null = body.spouseResidentId?.trim() || null;
    let resolvedSpouseName: string | null =
      body.spouseName?.trim() ||
      (hasStructuredSpouseName
        ? `${structuredSpouseName.firstName} ${structuredSpouseName.fatherName} ${structuredSpouseName.grandFatherName}`.trim()
        : null);
    let resolvedSpouseNameParts:
      | {
          firstName: string;
          fatherName: string;
          grandFatherName: string;
        }
      | null = hasStructuredSpouseName ? structuredSpouseName : null;
    let spouseResident:
      | {
          id: string;
          firstName: string;
          fatherName: string;
          grandFatherName: string;
          zoneId: string;
          woredaId: string;
          kebeleId: string;
          householdId: string | null;
        }
      | null = null;

    if (body.householdRole === "head" && body.maritalStatus !== "single") {
      if (!resolvedSpouseResidentId && !resolvedSpouseName) {
        return NextResponse.json(
          { error: "Spouse name or linked spouse record is required for non-single household heads" },
          { status: 400 },
        );
      }
      if (resolvedSpouseResidentId) {
        spouseResident = await db.resident.findUnique({
          where: { id: resolvedSpouseResidentId },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            zoneId: true,
            woredaId: true,
            kebeleId: true,
            householdId: true,
          },
        });
        if (!spouseResident) {
          return NextResponse.json({ error: "Selected spouse record not found" }, { status: 400 });
        }
        if (
          spouseResident.zoneId !== body.zoneId ||
          spouseResident.woredaId !== body.woredaId ||
          spouseResident.kebeleId !== body.kebeleId
        ) {
          return NextResponse.json({ error: "Spouse must be in the same administrative scope" }, { status: 400 });
        }
        if (spouseResident.householdId && resolvedHouseholdId && spouseResident.householdId !== resolvedHouseholdId) {
          return NextResponse.json({ error: "Selected spouse already belongs to another household" }, { status: 400 });
        }
        resolvedSpouseName =
          resolvedSpouseName ||
          `${spouseResident.firstName} ${spouseResident.fatherName} ${spouseResident.grandFatherName}`.trim();
        resolvedSpouseNameParts = {
          firstName: spouseResident.firstName,
          fatherName: spouseResident.fatherName,
          grandFatherName: spouseResident.grandFatherName,
        };
      }
    }

    let resolvedFatherResidentId: string | null = body.fatherResidentId?.trim() || null;
    let resolvedMotherResidentId: string | null = body.motherResidentId?.trim() || null;
    let resolvedMotherName: string | null = body.motherName?.trim() || null;
    if (body.householdRole === "child" && body.linkedHeadResidentId) {
      resolvedFatherResidentId = resolvedFatherResidentId || body.linkedHeadResidentId;
      if (resolvedHouseholdId) {
        const probableMother = await db.resident.findFirst({
          where: {
            householdId: resolvedHouseholdId,
            householdRole: "spouse",
            gender: "female",
          },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
          },
        });
        if (probableMother) {
          resolvedMotherResidentId = resolvedMotherResidentId || probableMother.id;
          resolvedMotherName =
            resolvedMotherName ||
            `${probableMother.firstName} ${probableMother.fatherName} ${probableMother.grandFatherName}`.trim();
        }
      }
    }

    const familyGraphError = await validateFamilyGraphForCreate(db, {
      fatherResidentId: resolvedFatherResidentId,
      motherResidentId: resolvedMotherResidentId,
      householdId: resolvedHouseholdId,
      linkedHeadResidentId: body.linkedHeadResidentId || null,
    });
    if (familyGraphError) {
      return NextResponse.json({ error: familyGraphError }, { status: 400 });
    }

    const residentId = `resident-${Date.now()}`;
    const created = await db.$transaction(async (tx) => {
      const isHeadRegistration = body.householdRole === "head";
      let spouseAutoCreatedId: string | null = null;
      const resident = await tx.resident.create({
        data: {
          id: residentId,
          firstName: body.firstName!,
          fatherName: body.fatherName!,
          grandFatherName: body.grandFatherName!,
          dateOfBirth: new Date(body.dateOfBirth!),
          gender: body.gender!,
          maritalStatus: body.maritalStatus!,
          nationality: body.nationality || "Ethiopian",
          ethnicity: body.ethnicity || null,
          religion: body.religion || null,
          occupation: body.occupation || null,
          phoneNumber: body.phoneNumber || null,
          email: body.email || null,
          zoneId: body.zoneId!,
          woredaId: body.woredaId!,
          kebeleId: body.kebeleId!,
          address: {
            city: body.address?.city || "Addis Ababa",
            subcity: body.address?.subcity || "",
            streetName: body.address?.streetName || "",
            houseNumber: body.address?.houseNumber || "",
            spouseName: resolvedSpouseName,
            spouseNameParts: resolvedSpouseNameParts,
            childrenNames: normalizedChildrenNames,
            relatives: Array.isArray(body.address?.relatives) ? body.address?.relatives : [],
          },
          photoUrl: body.photoUrl || null,
          faceStatus: "pending",
          faceError: null,
          faceUpdatedAt: null,
          // For household heads, create resident first, then create/upsert household and link back.
          householdId: isHeadRegistration ? null : resolvedHouseholdId,
          householdRole: body.householdRole || null,
          motherName: resolvedMotherName,
          fatherResidentId: resolvedFatherResidentId,
          motherResidentId: resolvedMotherResidentId,
          // New registrations are pending until super admin approval.
          status: "inactive",
          idStatus: "pending",
          registrationDate: new Date(),
          registeredBy: auth.user.id,
        },
      });

      if (isHeadRegistration && resolvedHouseholdId) {
        await tx.household.upsert({
          where: { id: resolvedHouseholdId },
          update: {
            headResidentId: resident.id,
            memberCount: { increment: 1 },
            contactPhone: body.phoneNumber || undefined,
          },
          create: {
            id: resolvedHouseholdId,
            zoneId: body.zoneId!,
            woredaId: body.woredaId!,
            kebeleId: body.kebeleId!,
            headResidentId: resident.id,
                address: {
                  city: body.address?.city || "Addis Ababa",
                  subcity: body.address?.subcity || "",
                  streetName: body.address?.streetName || "",
                  houseNumber: body.address?.houseNumber || "",
                  relatives: Array.isArray(body.address?.relatives) ? body.address?.relatives : [],
                },
            contactPhone: body.phoneNumber || null,
            memberCount: 1,
            status: "active",
          },
        });
        await tx.resident.update({
          where: { id: resident.id },
          data: { householdId: resolvedHouseholdId },
        });

        if (body.maritalStatus === "married") {
          if (spouseResident) {
            const spouseNeedsHouseholdLink = spouseResident.householdId !== resolvedHouseholdId;
            await tx.resident.update({
              where: { id: spouseResident.id },
              data: {
                householdId: resolvedHouseholdId,
                householdRole: "spouse",
                maritalStatus: "married",
              },
            });
            if (spouseNeedsHouseholdLink) {
              await tx.household.update({
                where: { id: resolvedHouseholdId },
                data: { memberCount: { increment: 1 } },
              });
            }
          } else if (resolvedSpouseName) {
            const parsed = splitNameParts(resolvedSpouseName);
            const spouseGender = body.gender === "male" ? "female" : "male";
            spouseAutoCreatedId = `resident-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            await tx.resident.create({
              data: {
                id: spouseAutoCreatedId,
                firstName: parsed.firstName,
                fatherName: parsed.fatherName,
                grandFatherName: parsed.grandFatherName,
                dateOfBirth: new Date(body.dateOfBirth!),
                gender: spouseGender,
                maritalStatus: "married",
                nationality: body.nationality || "Ethiopian",
                ethnicity: body.ethnicity || null,
                religion: body.religion || null,
                occupation: null,
                phoneNumber: null,
                email: null,
                zoneId: body.zoneId!,
                woredaId: body.woredaId!,
                kebeleId: body.kebeleId!,
                address: {
                  city: body.address?.city || "Addis Ababa",
                  subcity: body.address?.subcity || "",
                  streetName: body.address?.streetName || "",
                  houseNumber: body.address?.houseNumber || "",
                  autoCreatedFromResidentId: resident.id,
                  relatives: [],
                },
                photoUrl: null,
                faceStatus: "pending",
                faceError: null,
                faceUpdatedAt: null,
                householdId: resolvedHouseholdId,
                householdRole: "spouse",
                motherName: null,
                fatherResidentId: null,
                motherResidentId: null,
                status: "inactive",
                idStatus: "pending",
                registrationDate: new Date(),
                registeredBy: auth.user.id,
              },
            });
            await tx.household.update({
              where: { id: resolvedHouseholdId },
              data: { memberCount: { increment: 1 } },
            });
            resolvedSpouseResidentId = spouseAutoCreatedId;
            resolvedSpouseNameParts = {
              firstName: parsed.firstName,
              fatherName: parsed.fatherName,
              grandFatherName: parsed.grandFatherName,
            };
          }
        }
      } else if (resolvedHouseholdId) {
        await tx.household.update({
          where: { id: resolvedHouseholdId },
          data: { memberCount: { increment: 1 } },
        });
      }

      return {
        ...resident,
        householdId: isHeadRegistration ? resolvedHouseholdId : resident.householdId,
        spouseName: resolvedSpouseName,
        spouseNameParts: resolvedSpouseNameParts,
        spouseResidentId: resolvedSpouseResidentId,
        childrenNames: normalizedChildrenNames,
        spouseAutoCreatedId,
      };
    });

    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: auth.user.id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        action: "create",
        resourceType: "resident",
        resourceId: created.id,
        description: "Registered resident pending super admin approval",
        newValue: {
          residentId: created.id,
          status: "inactive",
          idStatus: "pending",
          householdId: created.householdId,
          householdRole: created.householdRole,
          motherName: created.motherName,
          fatherResidentId: created.fatherResidentId,
          motherResidentId: created.motherResidentId,
          spouseName: (created as any).spouseName ?? null,
          spouseNameParts: (created as any).spouseNameParts ?? null,
          spouseResidentId: (created as any).spouseResidentId ?? null,
          childrenNames: (created as any).childrenNames ?? [],
          spouseAutoCreatedId: (created as any).spouseAutoCreatedId ?? null,
        },
        zoneId: created.zoneId,
        woredaId: created.woredaId,
        kebeleId: created.kebeleId,
        timestamp: new Date(),
      },
    });

    let facePipelineResult: Awaited<ReturnType<typeof runFaceEmbeddingJob>> | null = null;
    if (created.photoUrl) {
      const faceJobInput = {
        residentId: created.id,
        photoUrl: created.photoUrl,
        actor: {
          id: auth.user.id,
          email: auth.user.email,
          role: auth.user.role,
        },
      } as const;

      if (FACE_PIPELINE_SYNC) {
        facePipelineResult = await runFaceEmbeddingJob(faceJobInput);
      } else {
        void runFaceEmbeddingJob(faceJobInput).catch((error) => {
          console.error("Async face embedding job failed:", error);
        });
      }
    }

    return NextResponse.json(
      {
        resident: created,
        faceStatus: facePipelineResult?.faceStatus ?? "pending",
        faceError: facePipelineResult?.error ?? null,
        faceMatch: facePipelineResult?.bestMatch ?? null,
        spouseAutoCreatedId: (created as any).spouseAutoCreatedId ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create resident:", error);
    return NextResponse.json({ error: "Failed to create resident" }, { status: 500 });
  }
}
