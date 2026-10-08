import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, scryptSync } from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const allowDemoSeed = process.env.ALLOW_DEMO_SEED === "true";
const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${key}`;
};

const zones = [
  { id: "zone-01", code: "01", name: "Gurage Zone", population: 45230 },
  { id: "zone-02", code: "02", name: "Silte Zone", population: 38750 },
  { id: "zone-03", code: "03", name: "Hadiya Zone", population: 52180 },
];

const woredas = [
  { id: "woreda-01-01", zoneId: "zone-01", code: "01", name: "Abeshige Woreda 1", population: 15420 },
  { id: "woreda-01-02", zoneId: "zone-01", code: "02", name: "Wolkite City Woreda 2", population: 14580 },
  { id: "woreda-01-03", zoneId: "zone-01", code: "03", name: "Cheha Woreda 3", population: 15230 },
 ];

const kebeles = woredas.flatMap((woreda) =>
  [1, 2, 3].map((n) => ({
    id: `kebele-${woreda.id}-${String(n).padStart(2, "0")}`,
    code: String(n).padStart(2, "0"),
    name: `${woreda.name} Kebele ${n}`,
    zoneId: woreda.zoneId,
    woredaId: woreda.id,
    population: Math.floor(woreda.population / 3),
    householdCount: Math.floor(woreda.population / 12),
  })),
);

const users = [
  {
    id: "user-001",
    email: "admin@registry.gov.et",
    passwordHash: hashPassword("admin123"),
    firstName: "Alemayehu",
    lastName: "Tadesse",
    role: "super_admin",
    scopeType: "city",
  },
  {
    id: "user-002",
    email: "bole.admin@registry.gov.et",
    passwordHash: hashPassword("zone123"),
    firstName: "Bekele",
    lastName: "Hailu",
    role: "zone_admin",
    scopeType: "zone",
    scopeZoneId: "zone-01",
  },
  {
    id: "user-003",
    email: "kirkos.admin@registry.gov.et",
    passwordHash: hashPassword("zone123"),
    firstName: "Meron",
    lastName: "Gebre",
    role: "zone_admin",
    scopeType: "zone",
    scopeZoneId: "zone-02",
  },
  {
    id: "user-004",
    email: "woreda1.bole@registry.gov.et",
    passwordHash: hashPassword("woreda123"),
    firstName: "Solomon",
    lastName: "Kebede",
    role: "woreda_admin",
    scopeType: "woreda",
    scopeZoneId: "zone-01",
    scopeWoredaId: "woreda-01-01",
  },
  {
    id: "user-005",
    email: "kebele01.bole1@registry.gov.et",
    passwordHash: hashPassword("kebele123"),
    firstName: "Tigist",
    lastName: "Alemu",
    role: "kebele_admin",
    scopeType: "kebele",
    scopeZoneId: "zone-01",
    scopeWoredaId: "woreda-01-01",
    scopeKebeleId: "kebele-woreda-01-01-01",
  },
  {
    id: "user-006",
    email: "auditor@registry.gov.et",
    passwordHash: hashPassword("audit123"),
    firstName: "Daniel",
    lastName: "Mengistu",
    role: "auditor",
    scopeType: "city",
  },
  {
    id: "user-007",
    email: "verify@registry.gov.et",
    passwordHash: hashPassword("verify123"),
    firstName: "Hanna",
    lastName: "Girma",
    role: "verification_officer",
    scopeType: "city",
  },
];

const sampleResidents = [
  ["Abebe", "Tadesse", "Kebede", "male"],
  ["Hanna", "Girma", "Bekele", "female"],
  ["Dawit", "Lemma", "Assefa", "male"],
  ["Meron", "Haile", "Wolde", "female"],
  ["Samuel", "Fikru", "Demissie", "male"],
  ["Liya", "Tesfaye", "Negash", "female"],
];

async function main() {
  if (process.env.NODE_ENV === "production" && !allowDemoSeed) {
    throw new Error("Refusing to seed demo credentials in production. Set ALLOW_DEMO_SEED=true to override.");
  }

  for (const zone of zones) {
    await prisma.zone.upsert({
      where: { id: zone.id },
      update: zone,
      create: zone,
    });
  }

  for (const woreda of woredas) {
    await prisma.woreda.upsert({
      where: { id: woreda.id },
      update: woreda,
      create: woreda,
    });
  }

  for (const kebele of kebeles) {
    await prisma.kebele.upsert({
      where: { id: kebele.id },
      update: kebele,
      create: kebele,
    });
  }

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  let counter = 1;
  for (const kebele of kebeles.slice(0, 12)) {
    const sample = sampleResidents[counter % sampleResidents.length];
    const id = `resident-${String(counter).padStart(4, "0")}`;
    await prisma.resident.upsert({
      where: { id },
      update: {
        kebeleId: kebele.id,
        woredaId: kebele.woredaId,
        zoneId: kebele.zoneId,
        firstName: sample[0],
        fatherName: sample[1],
        grandFatherName: sample[2],
        dateOfBirth: new Date(`199${counter % 10}-0${(counter % 8) + 1}-15T00:00:00.000Z`),
        gender: sample[3],
        nationality: "Ethiopian",
        maritalStatus: counter % 3 === 0 ? "married" : "single",
        phoneNumber: `+2519${String(10000000 + counter)}`,
        address: { city: "Addis Ababa", streetName: `Street ${counter}`, houseNumber: `${counter}/A` },
        status: "active",
        registrationDate: new Date("2025-01-01T00:00:00.000Z"),
        registeredBy: "user-005",
      },
      create: {
        id,
        kebeleId: kebele.id,
        woredaId: kebele.woredaId,
        zoneId: kebele.zoneId,
        firstName: sample[0],
        fatherName: sample[1],
        grandFatherName: sample[2],
        dateOfBirth: new Date(`199${counter % 10}-0${(counter % 8) + 1}-15T00:00:00.000Z`),
        gender: sample[3],
        nationality: "Ethiopian",
        maritalStatus: counter % 3 === 0 ? "married" : "single",
        phoneNumber: `+2519${String(10000000 + counter)}`,
        address: { city: "Addis Ababa", streetName: `Street ${counter}`, houseNumber: `${counter}/A` },
        status: "active",
        registrationDate: new Date("2025-01-01T00:00:00.000Z"),
        registeredBy: "user-005",
      },
    });
    counter += 1;
  }

  const residentRows = await prisma.resident.findMany({
    orderBy: { id: "asc" },
    take: 12,
  });

  for (let i = 0; i < residentRows.length; i += 3) {
    const group = residentRows.slice(i, i + 3);
    if (group.length === 0) continue;
    const head = group[0];
    const householdId = `household-${String(Math.floor(i / 3) + 1).padStart(3, "0")}`;

    await prisma.household.upsert({
      where: { id: householdId },
      update: {
        kebeleId: head.kebeleId,
        woredaId: head.woredaId,
        zoneId: head.zoneId,
        headResidentId: head.id,
        address: { houseNumber: `${i + 1}/A`, streetName: `Street ${i + 1}` },
        contactPhone: head.phoneNumber,
        memberCount: group.length,
        status: "active",
      },
      create: {
        id: householdId,
        kebeleId: head.kebeleId,
        woredaId: head.woredaId,
        zoneId: head.zoneId,
        headResidentId: head.id,
        address: { houseNumber: `${i + 1}/A`, streetName: `Street ${i + 1}` },
        contactPhone: head.phoneNumber,
        memberCount: group.length,
        status: "active",
      },
    });

    for (const member of group) {
      await prisma.resident.update({
        where: { id: member.id },
        data: {
          householdId,
          householdRole: member.id === head.id ? "head" : "child",
        },
      });
    }
  }

  await prisma.transfer.upsert({
    where: { id: "transfer-001" },
    update: {
      residentId: residentRows[0]?.id ?? "resident-0001",
      sourceKebeleId: "kebele-woreda-01-01-01",
      sourceWoredaId: "woreda-01-01",
      sourceZoneId: "zone-01",
      destinationKebeleId: "kebele-woreda-01-02-01",
      destinationWoredaId: "woreda-01-02",
      destinationZoneId: "zone-01",
      transferType: "within_woreda",
      reason: "Employment relocation",
      status: "pending_destination",
      initiatedBy: "user-005",
      initiatedAt: new Date("2026-03-01T11:00:00.000Z"),
      sourceApprovedBy: "user-005",
      sourceApprovedAt: new Date("2026-03-01T11:30:00.000Z"),
      requiresNewId: false,
    },
    create: {
      id: "transfer-001",
      residentId: residentRows[0]?.id ?? "resident-0001",
      sourceKebeleId: "kebele-woreda-01-01-01",
      sourceWoredaId: "woreda-01-01",
      sourceZoneId: "zone-01",
      destinationKebeleId: "kebele-woreda-01-02-01",
      destinationWoredaId: "woreda-01-02",
      destinationZoneId: "zone-01",
      transferType: "within_woreda",
      reason: "Employment relocation",
      status: "pending_destination",
      initiatedBy: "user-005",
      initiatedAt: new Date("2026-03-01T11:00:00.000Z"),
      sourceApprovedBy: "user-005",
      sourceApprovedAt: new Date("2026-03-01T11:30:00.000Z"),
      requiresNewId: false,
    },
  });

  await prisma.lifeEvent.upsert({
    where: { id: "event-001" },
    update: {
      residentId: residentRows[0]?.id ?? "resident-0001",
      eventType: "birth",
      eventDate: new Date("2024-06-15T00:00:00.000Z"),
      data: {
        type: "birth",
        birthPlace: "Addis Ababa",
        birthCertificateNumber: "BC-2024-001234",
      },
      documentRefs: [],
      relatedResidentIds: [],
      registeredBy: "user-005",
      registeredAt: new Date("2024-06-20T10:00:00.000Z"),
    },
    create: {
      id: "event-001",
      residentId: residentRows[0]?.id ?? "resident-0001",
      eventType: "birth",
      eventDate: new Date("2024-06-15T00:00:00.000Z"),
      data: {
        type: "birth",
        birthPlace: "Addis Ababa",
        birthCertificateNumber: "BC-2024-001234",
      },
      documentRefs: [],
      relatedResidentIds: [],
      registeredBy: "user-005",
      registeredAt: new Date("2024-06-20T10:00:00.000Z"),
    },
  });

  await prisma.duplicateCase.upsert({
    where: { id: "dup-001" },
    update: {
      resident1Id: residentRows[0]?.id ?? "resident-0001",
      resident2Id: residentRows[1]?.id ?? "resident-0002",
      overallScore: 85,
      scores: {
        nameScore: 28,
        phoneticScore: 12,
        dobScore: 18,
        phoneScore: 12,
        addressScore: 8,
        genderScore: 5,
        householdScore: 2,
      },
      status: "pending_review",
      priority: "high",
      detectedAt: new Date("2026-03-01T10:30:00.000Z"),
      detectionMethod: "batch_scan",
    },
    create: {
      id: "dup-001",
      resident1Id: residentRows[0]?.id ?? "resident-0001",
      resident2Id: residentRows[1]?.id ?? "resident-0002",
      overallScore: 85,
      scores: {
        nameScore: 28,
        phoneticScore: 12,
        dobScore: 18,
        phoneScore: 12,
        addressScore: 8,
        genderScore: 5,
        householdScore: 2,
      },
      status: "pending_review",
      priority: "high",
      detectedAt: new Date("2026-03-01T10:30:00.000Z"),
      detectionMethod: "batch_scan",
    },
  });

  await prisma.auditLog.upsert({
    where: { id: "audit-001" },
    update: {
      userId: "user-005",
      userEmail: "kebele01.bole1@registry.gov.et",
      userRole: "kebele_admin",
      action: "create",
      resourceType: "resident",
      resourceId: residentRows[0]?.id ?? "resident-0001",
      description: "Registered new resident record",
      kebeleId: "kebele-woreda-01-01-01",
      woredaId: "woreda-01-01",
      zoneId: "zone-01",
      timestamp: new Date("2026-03-04T08:15:00.000Z"),
    },
    create: {
      id: "audit-001",
      userId: "user-005",
      userEmail: "kebele01.bole1@registry.gov.et",
      userRole: "kebele_admin",
      action: "create",
      resourceType: "resident",
      resourceId: residentRows[0]?.id ?? "resident-0001",
      description: "Registered new resident record",
      kebeleId: "kebele-woreda-01-01-01",
      woredaId: "woreda-01-01",
      zoneId: "zone-01",
      timestamp: new Date("2026-03-04T08:15:00.000Z"),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
